import fetch from 'node-fetch';

export async function getTopicGraph({topicSlug, linkType = 'is-a'}) {
  const url = `https://www.sefaria.org/api/topics-graph/${topicSlug}?link_type=${linkType}`;
  const response = await fetch(url);
  return await response.json();
}