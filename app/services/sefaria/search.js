import fetch from 'node-fetch';

export async function searchSefaria(args) {
  const url = 'https://www.sefaria.org/api/search-wrapper';
  const body = {
    query: args.query,
    type: args.type,
    filters: args.filters,
    size: args.size,
    // Add other required parameters as needed
    aggs: args.aggs,
    field: args.field,
    filter_fields: args.filter_fields,
    slop: args.slop,
    sort_fields: args.sort_fields,
    sort_method: args.sort_method,
    sort_reverse: args.sort_reverse,
    sort_score_missing: 0.04,
    source_proj: true
  };

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  });

  return await response.json();
}