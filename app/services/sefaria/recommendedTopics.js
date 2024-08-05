import fetch from 'node-fetch';

export async function getRecommendedTopics(ref_list) {
  const baseUrl = 'https://www.sefaria.org/api/';
  const url = `${baseUrl}topics?refs=${ref_list.replace(/\+/g, '|')}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching recommended topics for refs: ${ref_list}`, error);
    throw new Error(`Failed to retrieve recommended topics for refs: ${ref_list}`);
  }
}