"""Run one API Studio Python handler in a bounded child process."""
import hashlib
import json
import math
import random
import re
import sys
import time
from datetime import datetime


def apply_limits():
    try:
        import resource
    except ImportError:
        return
    for name, limit in (
        ('RLIMIT_CPU', 3),
        ('RLIMIT_AS', 512 * 1024 * 1024),
        ('RLIMIT_FSIZE', 2 * 1024 * 1024),
    ):
        kind = getattr(resource, name, None)
        if kind is not None:
            try:
                resource.setrlimit(kind, (limit, limit))
            except (OSError, ValueError):
                pass


def run(code, request_context):
    safe_builtins = {
        'abs': abs, 'all': all, 'any': any, 'bin': bin, 'bool': bool, 'chr': chr,
        'dict': dict, 'dir': dir, 'divmod': divmod, 'enumerate': enumerate,
        'filter': filter, 'float': float, 'format': format, 'frozenset': frozenset,
        'getattr': getattr, 'hasattr': hasattr, 'hash': hash, 'hex': hex, 'id': id,
        'int': int, 'isinstance': isinstance, 'issubclass': issubclass, 'iter': iter,
        'len': len, 'list': list, 'map': map, 'max': max, 'min': min, 'next': next,
        'oct': oct, 'ord': ord, 'pow': pow, 'print': lambda *args, **kwargs: None,
        'range': range, 'reversed': reversed, 'round': round, 'set': set, 'slice': slice,
        'sorted': sorted, 'str': str, 'sum': sum, 'tuple': tuple, 'type': type,
        'zip': zip, 'None': None, 'True': True, 'False': False,
        'Exception': Exception, 'ValueError': ValueError, 'KeyError': KeyError,
        'TypeError': TypeError
    }
    scope = {
        '__builtins__': safe_builtins,
        'math': math, 'json': json, 're': re, 'time': time,
        'datetime': datetime, 'random': random, 'hashlib': hashlib
    }
    local_scope = {}
    exec(code, scope, local_scope)
    handler = local_scope.get('handle') or local_scope.get('handler') or local_scope.get('main')
    if callable(handler):
        return handler(request_context)
    if 'result' in local_scope:
        return local_scope['result']
    return {'output': '핸들러 함수(def handle(req):)를 정의하세요.'}


if __name__ == '__main__':
    apply_limits()
    try:
        request = json.load(sys.stdin)
        result = run(request['code'], request['context'])
        if not isinstance(result, (dict, list, str, int, float, bool, type(None))):
            result = str(result)
        output = json.dumps({'ok': True, 'result': result}, ensure_ascii=False)
        if len(output.encode('utf-8')) > 1024 * 1024:
            raise ValueError('응답은 1MB 이하만 지원합니다.')
        sys.stdout.write(output)
    except Exception as error:
        sys.stdout.write(json.dumps({'ok': False, 'error': str(error)}, ensure_ascii=False))
