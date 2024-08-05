import fetch from 'node-fetch';

export async function getTopic({ topic_slug, with_links = 1 }) {
  const url = `https://www.sefaria.org/api/topics/${topic_slug}?with_links=${with_links}`;
  const response = await fetch(url);
  return await response.json();
}