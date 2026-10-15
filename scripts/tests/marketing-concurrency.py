"""Local Docker concurrency probe. Clones SQL algorithms into an isolated disposable schema.

No application requests, credentials, real messages or public-table fixture writes.
Only generated-schema objects are removed. Requires Python and the existing local DB container.
"""
import concurrent.futures
import hashlib
import json
import re
import statistics
import subprocess
import time
import uuid

CONTAINER = 'supabase_db_agency-manager'
SCHEMA = 'marketing_test_' + uuid.uuid4().hex
ORG = str(uuid.uuid4())
assert re.fullmatch(r'marketing_test_[a-f0-9]{32}', SCHEMA)


def sql(statement):
    result = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-X', '-qAt', '-U', 'postgres',
                             '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], input=statement,
                            text=True, encoding='utf-8', capture_output=True, timeout=60)
    if result.returncode:
        # Statements and diagnostics contain only synthetic fixture data and SQL definitions.
        raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()


def claim(limit=25):
    started = time.perf_counter()
    data = json.loads(sql(f"SELECT coalesce(json_agg(json_build_object('id',id,'token',claim_token,'campaign',campaign_id)),'[]') FROM {SCHEMA}.claim_marketing_enrollments({limit});"))
    return data, (time.perf_counter() - started) * 1000


tables = ['integration_connections', 'marketing_campaigns', 'marketing_sequences', 'marketing_steps', 'leads',
          'messaging_templates', 'marketing_enrollments', 'marketing_number_pacing', 'marketing_channel_health',
          'marketing_consent_events', 'marketing_opt_out_receipts', 'meta_outbound_outbox',
          'marketing_recipient_pacing', 'conversations', 'messages']
functions = ['marketing_phone_key(text)', 'marketing_schedule_open(jsonb,timestamp with time zone)',
             'marketing_recipient_allowed(uuid,text)', 'marketing_channel_dispatch_open(uuid,uuid)',
             'marketing_outbound_allowed_before_health(uuid,uuid,text)',
             'marketing_outbound_allowed_before_reply(uuid,uuid,text)', 'marketing_reply_at(uuid,uuid)',
             'marketing_outbound_allowed(uuid,uuid,text)', 'stop_marketing_followups_on_reply(uuid,uuid,text)',
             'claim_marketing_enrollments_before_email(integer)', 'claim_marketing_email_enrollments(integer)',
             'claim_marketing_enrollments(integer)',
             'reserve_marketing_dispatch_before_recipient(uuid,uuid,text,uuid)',
             'reserve_marketing_dispatch(uuid,uuid,text,uuid)']
definition_hash = hashlib.sha256()
created = False
try:
    sql(f'CREATE SCHEMA {SCHEMA}; REVOKE ALL ON SCHEMA {SCHEMA} FROM PUBLIC;')
    created = True
    for table in tables:
        sql(f'CREATE TABLE {SCHEMA}.{table} (LIKE public.{table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING IDENTITY);')
    for function in functions:
        definition = json.loads(sql(f"SELECT to_json(pg_get_functiondef('public.{function}'::regprocedure));"))
        definition_hash.update(definition.encode('utf-8'))
        sql(definition.replace('public.', SCHEMA + '.').replace('search_path TO \'public\'', f"search_path TO '{SCHEMA}'"))

    pools = [dict(connection=str(uuid.uuid4()), campaign=str(uuid.uuid4()), sequence=str(uuid.uuid4()),
                  step=str(uuid.uuid4()), template=str(uuid.uuid4())) for _ in range(30)]
    campaign_to_connection = {pool['campaign']: pool['connection'] for pool in pools}
    setup = ['BEGIN;']
    for i, pool in enumerate(pools):
        c, campaign, sequence, step, template = (pool[key] for key in ['connection', 'campaign', 'sequence', 'step', 'template'])
        physical = 'synthetic-shared' if i < 2 else 'synthetic-' + c
        setup.extend([
            f"INSERT INTO {SCHEMA}.integration_connections(id,organization_id,provider_key,connection_name,status,credentials,metadata) VALUES('{c}','{ORG}','whatsapp_cloud','Synthetic load channel','active','{{}}','{{\"phone_number_id\":\"{physical}\"}}');",
            f"INSERT INTO {SCHEMA}.marketing_channel_health(connection_id,organization_id,quality,checked_at) VALUES('{c}','{ORG}','GREEN',clock_timestamp());",
            f"INSERT INTO {SCHEMA}.marketing_campaigns(id,organization_id,name,status,connection_id,execution_version,delivery_config) VALUES('{campaign}','{ORG}','Synthetic load campaign','active','{c}',2,'{{\"mode\":\"growth\",\"humanize\":false,\"timezone\":\"America/Bogota\"}}');",
            f"INSERT INTO {SCHEMA}.marketing_sequences(id,organization_id,campaign_id,name,trigger_type,is_active) VALUES('{sequence}','{ORG}','{campaign}','Synthetic sequence','manual',true);",
            f"INSERT INTO {SCHEMA}.messaging_templates(id,organization_id,channel_id,name,language,status,category,meta_id,components,content) VALUES('{template}','{ORG}','{c}','fixture_promo','es','APPROVED','MARKETING','synthetic','[]','{{}}');",
            f"INSERT INTO {SCHEMA}.marketing_steps(id,organization_id,sequence_id,name,type,order_index,content) VALUES('{step}','{ORG}','{sequence}','Synthetic template','whatsapp',0,'{{\"template_id\":\"{template}\",\"template_name\":\"fixture_promo\",\"template_language\":\"es\"}}');",
            f"WITH contacts AS (INSERT INTO {SCHEMA}.leads(organization_id,name,phone) SELECT '{ORG}','Synthetic recipient',(573009000000+{i}*200+n)::text FROM generate_series(1,200)n RETURNING id,phone) INSERT INTO {SCHEMA}.marketing_enrollments(organization_id,campaign_id,sequence_id,contact_id,current_step_id,status,next_run_at,recipient,recipient_snapshot) SELECT '{ORG}','{campaign}','{sequence}',id,'{step}','active',now()-interval '{2 if i < 25 else 1} days',phone,'{{}}' FROM contacts;",
        ])
    setup.append(f"INSERT INTO {SCHEMA}.marketing_consent_events(id,organization_id,recipient,event,source,evidence,occurred_at) OVERRIDING SYSTEM VALUE SELECT row_number() OVER(), '{ORG}',phone,'granted','synthetic-test','Synthetic test only',now() FROM {SCHEMA}.leads;")
    setup.append('COMMIT;')
    sql('\n'.join(setup))

    first, latency1 = claim()
    second, latency2 = claim()
    assert len({campaign_to_connection[row['campaign']] for row in first + second}) == 30, 'Old backlogs starved newer numbers'
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as workers:
        batches = list(workers.map(lambda _: claim(), range(64)))
    rows = first + second + [row for batch, _ in batches for row in batch]
    assert len({row['id'] for row in rows}) == len(rows), 'Concurrent workers duplicated a lease'
    for batch, _ in batches:
        assert len(batch) <= 25
        assert len({campaign_to_connection[row['campaign']] for row in batch}) == len(batch), 'A batch overclaimed one number'

    old = first[0]
    conn = campaign_to_connection[old['campaign']]
    sql(f"UPDATE {SCHEMA}.marketing_enrollments SET claimed_until=clock_timestamp()-interval '1 second',next_run_at=clock_timestamp()-interval '30 days' WHERE id='{old['id']}'; UPDATE {SCHEMA}.marketing_channel_health SET last_claimed_at=NULL WHERE connection_id='{conn}';")
    resumed, _ = claim(1)
    assert resumed[0]['id'] == old['id'] and resumed[0]['token'] != old['token'], 'Expired lease was not reclaimed with a new token'
    changed = sql(f"WITH changed AS(UPDATE {SCHEMA}.marketing_enrollments SET status='failed' WHERE id='{old['id']}' AND claim_token='{old['token']}' RETURNING id) SELECT count(*) FROM changed;")
    assert changed == '0', 'An old worker could overwrite a new lease'

    reservations = []
    for pool in pools[:2]:
        jobs = json.loads(sql(f"SELECT json_agg(json_build_object('id',id,'recipient',recipient)) FROM (SELECT id,recipient FROM {SCHEMA}.marketing_enrollments WHERE campaign_id='{pool['campaign']}' LIMIT 4) jobs;"))
        for job in jobs:
            operation = f"campaign:{job['id']}:{pool['step']}"
            outbox = str(uuid.uuid4())
            sql(f"INSERT INTO {SCHEMA}.meta_outbound_outbox(id,organization_id,connection_id,operation_key,recipient,content,sender,channel,status) VALUES('{outbox}','{ORG}','{pool['connection']}','{operation}','{job['recipient']}','{{}}','System','whatsapp','sending');")
            reservations.append((pool['connection'], operation, outbox))

    def reserve(args):
        connection, operation, outbox = args
        return json.loads(sql(f"SELECT {SCHEMA}.reserve_marketing_dispatch('{ORG}','{connection}','{operation}','{outbox}');"))

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as workers:
        reserved = list(workers.map(reserve, reservations))
    assert sum(result['allowed'] for result in reserved) == 1, 'Concurrent campaigns bypassed shared physical-number pacing'
    latencies = sorted([latency1, latency2] + [duration for _, duration in batches])
    print(json.dumps(dict(recipients=6000, channels=30, workers=8, claim_calls=66, unique_leases=len(rows),
                          duplicate_leases=0, numbers_seen_in_first_two_batches=30, expired_lease_recovered=True,
                          stale_checkpoint_rejected=True, concurrent_reservations=8, permitted_reservations=1,
                          claim_p50_ms=round(statistics.median(latencies), 2), claim_p95_ms=round(latencies[int(len(latencies)*.95)], 2),
                          sql_definition_sha256=definition_hash.hexdigest())))
finally:
    if created:
        sql(f"DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='{SCHEMA}' AND nspowner=current_user::regrole) THEN RAISE EXCEPTION 'Unexpected schema ownership'; END IF; END $$; DROP SCHEMA {SCHEMA} CASCADE;")
