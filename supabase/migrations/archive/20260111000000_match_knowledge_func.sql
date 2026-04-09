-- RAG Search Function
-- Matches user query embedding against knowledge base vectors
-- using cosine similarity (1 - (a <=> b))

create or replace function match_knowledge (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  msg_org_id uuid
)
returns table (
  id uuid,
  question text,
  answer text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    kb.id,
    kb.question,
    kb.answer,
    1 - (kb.embedding <=> query_embedding) as similarity
  from knowledge_base kb
  where 1 - (kb.embedding <=> query_embedding) > match_threshold
  and kb.organization_id = msg_org_id
  order by kb.embedding <=> query_embedding
  limit match_count;
end;
$$;
