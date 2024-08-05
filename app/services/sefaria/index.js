import fetch from 'node-fetch';

export async function getAllDataForIndex(indexTitle) {
  const url = `https://www.sefaria.org/api/v2/raw/index/${encodeURIComponent(
    indexTitle
  )}`;
  const response = await fetch(url);
  return await response.json();
}
