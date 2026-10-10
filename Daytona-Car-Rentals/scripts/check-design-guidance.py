"""Query the installed Codex app-server discovery API; no model call or credentials output.
Usage: python3 scripts/check-design-guidance.py /absolute/path/to/codex [cwd ...]
"""
import json
from pathlib import Path
import queue
import subprocess
import sys
import threading

if len(sys.argv) < 2:
    raise SystemExit(__doc__)
root = Path(__file__).resolve().parents[2]
cwds = sys.argv[2:] or [str(root / 'Daytona-Car-Rentals'), str(Path.home())]
server = subprocess.Popen([sys.argv[1], 'app-server'], stdin=subprocess.PIPE,
                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                          text=True, bufsize=1)
messages = queue.Queue()
def receive():
    for line in server.stdout:
        messages.put(json.loads(line))
threading.Thread(target=receive, daemon=True).start()
def call(identifier, method, params):
    server.stdin.write(json.dumps({'id': identifier, 'method': method, 'params': params}) + '\n')
    server.stdin.flush()
    while True:
        message = messages.get(timeout=30)
        if message.get('id') == identifier:
            if 'error' in message:
                raise RuntimeError(message['error'].get('message', 'Discovery failed'))
            return message['result']
try:
    call(1, 'initialize', {'clientInfo': {'name': 'design-guidance-check', 'version': '1.0'},
                         'capabilities': {'experimentalApi': True}})
    server.stdin.write('{"method":"initialized"}\n')
    server.stdin.flush()
    result = call(2, 'skills/list', {'cwds': cwds, 'forceReload': True})
    evidence = [{'cwd': row['cwd'],
                 'skills': [s for s in row.get('skills', []) if s.get('name') == 'design-with-evidence'],
                 'errorCount': len(row.get('errors', []))} for row in result['data']]
    print(json.dumps(evidence, indent=2))
    if not evidence or any(not row['skills'] for row in evidence):
        raise SystemExit('Skill is not discovered in every requested directory.')
finally:
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()
