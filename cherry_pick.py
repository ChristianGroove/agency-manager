import re
hashes = []
with open(r'G:\Pixy\_audit_reports\pixy-phase0-pr-partition-20260612.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(547, 691):
        m = re.search(r'- `([a-f0-9]{8})`', lines[i])
        if m:
            hashes.append(m.group(1))
print(' '.join(hashes))
