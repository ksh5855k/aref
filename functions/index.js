// functions/index.js (최종 v2 환경변수 수정본)

const functions = require("firebase-functions");
const axios = require("axios");
const cheerio = require("cheerio");

// OpenAI 클라이언트를 초기화하는 부분을 별도의 함수로 만듭니다.
let openai;
async function initializeOpenAI() {
    if (!openai) {
        // ▼▼▼▼▼ 바로 이 부분이 수정되었습니다! ▼▼▼▼▼
        // functions.config() 대신 process.env를 사용합니다.
        const openaiApiKey = process.env.OPENAI_API_KEY; 
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        if (!openaiApiKey) {
            console.error("OpenAI API Key not set in environment variables.");
            return null;
        }
        // ESM 전용 'openai' 라이브러리를 동적으로 import 합니다.
        const { OpenAI } = await import("openai");
        openai = new OpenAI({ apiKey: openaiApiKey });
    }
    return openai;
}

// 'summarizeUrl' Cloud Function (웹사이트에서 호출)
exports.summarizeUrl = functions.https.onCall(async (data, context) => {
  // 함수가 호출될 때마다 OpenAI 클라이언트를 가져옵니다.
  const openaiClient = await initializeOpenAI();
  if (!openaiClient) {
      throw new functions.https.HttpsError('internal', 'OpenAI API 키가 설정되지 않았습니다.');
  }

  const urlToSummarize = data.url;
  if (!urlToSummarize) {
    throw new functions.https.HttpsError('invalid-argument', 'URL이 필요합니다.');
  }
  functions.logger.info("요약할 URL을 받았습니다:", urlToSummarize);

  try {
    // Axios로 웹페이지 HTML 내용을 가져옵니다.
    const response = await axios.get(urlToSummarize, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
    });
    const html = response.data;

    // Cheerio로 HTML에서 주요 텍스트만 추출합니다.
    const $ = cheerio.load(html);
    let pageText = ($('h1').text() + " " + $('h2').text() + " " + $('article p').text() + " " + $('main p').text() + " " + $('p').text()).substring(0, 8000);
    pageText = pageText.replace(/\s\s+/g, ' ').trim();

    if (!pageText) {
        throw new functions.https.HttpsError('not-found', '웹페이지에서 요약할 텍스트를 추출하지 못했습니다.');
    }
    const textToSummarize = pageText.substring(0, 4000);

    functions.logger.info("추출된 텍스트 길이:", textToSummarize.length);

    // v6 방식의 OpenAI API 호출
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 주어진 웹페이지 텍스트를 분석하여 마케팅 레퍼런스로 요약하는 전문가입니다. 반드시 다음 세 가지 항목 제목([캠페인 요약], [Why it works], [How to apply])을 포함하고, 각 항목의 내용을 명확하게 구분하여 한국어로 작성해주세요.",
        },
        {
          role: "user",
          content: `다음 텍스트를 분석하고 마케팅 관점에서 요약해 주세요:\n\n${textToSummarize}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    functions.logger.info("AI 응답:", aiResponse);

    // AI 응답을 파싱하여 각 항목으로 분리합니다.
    const summaryMatch = aiResponse.match(/\[캠페인 요약\]\s*([\s\S]*?)(?=\s*\[Why it works\]|$)/i);
    const whyMatch = aiResponse.match(/\[Why it works\]\s*([\s\S]*?)(?=\s*\[How to apply\]|$)/i);
    const howMatch = aiResponse.match(/\[How to apply\]\s*([\s\S]*?)$/i);

    // 결과를 웹사이트에 반환합니다.
    return {
      summary: summaryMatch ? summaryMatch[1].trim() : "요약 생성 실패",
      why: whyMatch ? whyMatch[1].trim() : "분석 실패",
      how: howMatch ? howMatch[1].trim() : "적용 방안 생성 실패",
    };

  } catch (error) {
    functions.logger.error("요약 중 에러 발생:", error.message);
    
    if (axios.isAxiosError(error)) {
         if (error.response) {
             functions.logger.error("Axios Error Status:", error.response.status);
             if (error.response.status === 403 || error.response.status === 404) {
                 throw new functions.https.HttpsError('permission-denied', '해당 URL의 콘텐츠를 가져올 수 없습니다 (접근 제한 또는 찾을 수 없음).');
             }
         } else if (error.request) {
             throw new functions.https.HttpsError('unavailable', '웹사이트에 연결할 수 없습니다.');
         }
    } else if (error.response && error.response.data && error.response.data.error) { // OpenAI 에러 처리
        functions.logger.error("OpenAI API Error:", error.response.data.error.message);
        throw new functions.https.HttpsError('internal', `AI 요약 실패: ${error.response.data.error.message}`);
    }
    
    throw new functions.https.HttpsError('unknown', 'AI 요약 중 예상치 못한 오류가 발생했습니다.');
  }
});