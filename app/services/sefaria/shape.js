import fetch from 'node-fetch';

export async function getTextShape(args) {
  let url = `https://www.sefaria.org/api/shape/${args.title}`;
  const queryParams = [];

  if (args.depth !== undefined) {
    queryParams.push(`depth=${args.depth}`);
  }

  if (args.dependents !== undefined) {
    queryParams.push(`dependents=${args.dependents}`);
  }

  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }

  console.log('getTextShape url:', url);

  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(`Error calling getTextShape for title: ${args.title}`, error);
    throw new Error(`Failed to retrieve text shape data for ${args.title}`);
  }
}