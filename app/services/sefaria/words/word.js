import fetch from 'node-fetch';

export async function getLexiconEntry(args) {
  let url = `https://www.sefaria.org/api/words/${args.word}`;
  const queryParams = [];

  if (args.language !== undefined) {
    queryParams.push(`language=${args.language}`);
  }

  if (queryParams.length > 0) {
    url += `?${queryParams.join('&')}`;
  }

  console.log('getLexiconEntry url:', url);

  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error(
      `Error calling getLexiconEntry for word: ${args.word}`,
      error
    );
    throw new Error(`Failed to retrieve lexicon entry for ${args.word}`);
  }
}