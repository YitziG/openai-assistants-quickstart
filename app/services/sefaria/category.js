import fetch from 'node-fetch';

export async function getSefariaCategory(categoryPath) {
  const url = `https://www.sefaria.org/api/category/${categoryPath}`;
  const response = await fetch(url);
  return await response.json();
}