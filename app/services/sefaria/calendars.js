import fetch from 'node-fetch';

export async function getLearningSchedule(diaspora) {
  //only include the diaspora parameter if it is true
  const diasporaParam = diaspora ? '?diaspora=1' : '';
  const url = `https://www.sefaria.org/api/calendars${diasporaParam}`;
  const response = await fetch(url);
  return await response.json();
}

// console.log(await getLearningSchedule({"year":2023,"month":10,"day":6,"timezone":"Asia/Jerusalem"}));
