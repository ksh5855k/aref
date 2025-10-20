// functions/index.js

const functions = require("firebase-functions");
const { OpenAI } = require("openai"); // OpenAI 통역기 가져오기
const axios = require("axios"); // 웹페이지 수집 로봇 가져오기
const cheerio = require("cheerio"); // HTML 정리 도구 가져오기

// 1. Firebase 환경 변수에서 OpenAI API 키를 안전하게 가져옵니다.
const openaiApiKey = functions.config().openai.key;
const openai = new OpenAI({ apiKey: openaiApiKey });

// 'summarizeUrl' Cloud Function (웹사이트에서 호출)
exports.summarizeUrl = functions.https.onCall(async (data, context) => {
  const urlToSummarize = data.url;
  if (!urlToSummarize) {
    throw new functions.https.HttpsError('invalid-argument', 'URL이 필요합니다.');
  }
  functions.logger.info("요약할 URL을 받았습니다:", urlToSummarize);

  try {
    // 2. Axios로 웹페이지 HTML 내용을 가져옵니다.
    const response = await axios.get(urlToSummarize, {
        headers: { // 일부 웹사이트는 봇 접근을 막으므로, 일반 브라우저처럼 보이게 합니다.
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    const html = response.data;

    // 3. Cheerio로 HTML에서 주요 텍스트만 추출합니다. (간단한 방식)
    const $ = cheerio.load(html);
    let pageText = $('h1').text() + "\n" + $('p').text(); // 제목과 문단 위주로 추출
    pageText = pageText.replace(/\s\s+/g, ' ').trim(); // 불필요한 공백 제거
    // 텍스트가 너무 길면 OpenAI API 제한에 걸릴 수 있으니 일부만 사용합니다.
    const textToSummarize = pageText.substring(0, 4000);

    functions.logger.info("추출된 텍스트 길이:", textToSummarize.length);

    // 4. OpenAI API (GPT 모델)에게 요약을 요청합니다.
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // 비용 효율적인 모델 사용 (GPT-4는 더 비쌈)
      messages: [
        {
          role: "system",
          content: "당신은 주어진 웹페이지 텍스트를 분석하여 마케팅 레퍼런스로 요약하는 전문가입니다. 반드시 다음 세 가지 항목으로 나누어 답변해주세요: [캠페인 요약], [Why it works], [How to apply]",
        },
        {
          role: "user",
          content: `다음 텍스트를 분석하고 요약해 주세요:\n\n${textToSummarize}`,
        },
      ],
      max_tokens: 500, // 답변 최대 길이 조절
      temperature: 0.7, // 창의성 조절 (0~1)
    });

    const aiResponse = completion.choices[0].message.content;
    functions.logger.info("AI 응답:", aiResponse);

    // 5. AI 응답을 파싱하여 각 항목으로 분리합니다. (간단한 방식)
    const summaryMatch = aiResponse.match(/\[캠페인 요약\]\s*([\s\S]*?)(?=\s*\[Why it works\]|$)/);
    const whyMatch = aiResponse.match(/\[Why it works\]\s*([\s\S]*?)(?=\s*\[How to apply\]|$)/);
    const howMatch = aiResponse.match(/\[How to apply\]\s*([\s\S]*?)$/);

    // 6. 결과를 웹사이트에 반환합니다.
    return {
      summary: summaryMatch ? summaryMatch[1].trim() : "요약 생성 실패",
      why: whyMatch ? whyMatch[1].trim() : "분석 실패",
      how: howMatch ? howMatch[1].trim() : "적용 방안 생성 실패",
    };

  } catch (error) {
    functions.logger.error("요약 중 에러 발생:", error);
    if (error.response && error.response.status === 403) {
        throw new functions.https.HttpsError('permission-denied', '해당 웹사이트의 콘텐츠를 가져올 수 없습니다 (접근 제한).');
    }
    throw new functions.https.HttpsError('unknown', 'AI 요약 중 오류가 발생했습니다.', error.message);
  }
});