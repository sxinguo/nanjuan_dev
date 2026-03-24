"""
微信 API 调用基础模块
"""
import json
import os
import time
import urllib.request
import urllib.error

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_FILE = os.path.join(SKILL_DIR, 'config.json')
TOKEN_CACHE_FILE = os.path.join(SKILL_DIR, 'token_cache.json')


def load_config():
    """加载配置文件"""
    if not os.path.exists(CONFIG_FILE):
        raise Exception("配置文件不存在，请先配置 AppID 和 AppSecret")

    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        config = json.load(f)

    if not config.get('appid') or not config.get('appsecret'):
        raise Exception("配置文件缺少 appid 或 appsecret，请先配置")

    return config


def load_token_cache():
    """加载 token 缓存"""
    if not os.path.exists(TOKEN_CACHE_FILE):
        return None

    with open(TOKEN_CACHE_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_token_cache(token_data):
    """保存 token 缓存"""
    with open(TOKEN_CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(token_data, f, ensure_ascii=False, indent=2)


def get_access_token(force_refresh=False):
    """
    获取 access_token，带自动缓存和刷新逻辑
    force_refresh: 强制刷新 token
    """
    cache = load_token_cache()

    # 检查缓存是否有效（提前5分钟刷新）
    if not force_refresh and cache:
        expires_at = cache.get('expires_at', 0)
        if time.time() < expires_at - 300:
            return cache['access_token']

    # 获取新 token
    config = load_config()
    url = f"https://api.weixin.qq.com/cgi-bin/token"
    params = {
        'grant_type': 'client_credential',
        'appid': config['appid'],
        'secret': config['appsecret']
    }

    query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
    full_url = f"{url}?{query_string}"

    try:
        with urllib.request.urlopen(full_url, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        raise Exception(f"获取 token 失败: {e.code} - {error_body}")
    except Exception as e:
        raise Exception(f"获取 token 失败: {str(e)}")

    if 'access_token' not in result:
        raise Exception(f"获取 token 失败: {result.get('errmsg', '未知错误')}")

    # 缓存 token
    token_data = {
        'access_token': result['access_token'],
        'expires_in': result.get('expires_in', 7200),
        'expires_at': time.time() + result.get('expires_in', 7200)
    }
    save_token_cache(token_data)

    return result['access_token']


def api_request(url, method='GET', data=None, token=None):
    """
    通用 API 请求方法
    """
    if token:
        separator = '&' if '?' in url else '?'
        url = f"{url}{separator}access_token={token}"

    try:
        if method == 'GET':
            with urllib.request.urlopen(url, timeout=30) as response:
                return json.loads(response.read().decode('utf-8'))
        else:
            req = urllib.request.Request(
                url,
                data=json.dumps(data, ensure_ascii=False).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_json = json.loads(error_body)
            raise Exception(f"API 请求失败: {error_json.get('errmsg', error_body)}")
        except:
            raise Exception(f"API 请求失败: {e.code} - {error_body}")
    except Exception as e:
        raise Exception(f"API 请求失败: {str(e)}")
