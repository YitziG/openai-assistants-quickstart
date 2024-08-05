// get learning calendar items from Sefaria
import fetch from 'node-fetch';

/* Function to fetch data from the API */
async function fetchData(relativeUrl) {
  const baseUrl = 'https://www.sefaria.org/api/';
  const response = await fetch(`${baseUrl}${relativeUrl}`);
  return await response.json();
}

export async function getSefariaText(args) {
  let url = `https://www.sefaria.org/api/v3/texts/${args.tref}`;

  if (args.version !== undefined) {
    url += `?version=${args.version}`;
  }

  console.log('getSefariaText url:', url);

  try {
    const response = await fetch(url);
    console.log('response:', response);
    return await response.json();
  } catch (error) {
    console.error(`Error calling getSefariaText for ref: ${args.tref}`, error);
    throw new Error(`Failed to retrieve text data for ${args.tref}`);
  }
}

/* Function to retrieve Parasha commentaries */
export async function getRelated(args) {
  return await fetchData(`related/${args.tref}`);

  // /* Extracting commentaries */
  // return data['links']
  //   .filter((link) => link['type'] === 'commentary')
  //   .map((commentary) => commentary['ref']);
}

/* Function to get the commentary text */
export async function getCommentaryText(commentRef) {
  const data = await fetchData(`v3/texts/${commentRef}`);

  /* Checking for primary version of commentary */
  if ('versions' in data && data['versions'].length > 0) {
    const {
      title,
      versions: [{ text }]
    } = data;
    return { title, text };
  }
  return null;
}