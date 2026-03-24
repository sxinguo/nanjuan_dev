"""
上传永久图片素材，获取 media_id
用于创建图片消息草稿 (newspic)
"""
import os
import sys
import json
import urllib.request
import urllib.error
import mimetypes

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wechat_api import get_access_token, load_config

def upload_permanent_image(file_path):
    """
    上传永久图片素材
    返回 media_id
    """
    if not os.path.exists(file_path):
        raise Exception(f"图片文件不存在: {file_path}")

    # 获取 token
    token = get_access_token()

    url = f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={token}&type=image"

    # 获取文件的 MIME 类型
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        mime_type = 'image/jpeg'

    # 构建 multipart/form-data 请求
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

    with open(file_path, 'rb') as f:
        file_data = f.read()

    file_name = os.path.basename(file_path)

    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="media"; filename="{file_name}"\r\n'
        f'Content-Type: {mime_type}\r\n\r\n'
    ).encode('utf-8') + file_data + f'\r\n--{boundary}--\r\n'.encode('utf-8')

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'Content-Type': f'multipart/form-data; boundary={boundary}'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_json = json.loads(error_body)
            raise Exception(f"上传图片失败: {error_json.get('errmsg', error_body)}")
        except:
            raise Exception(f"上传图片失败: {e.code} - {error_body}")
    except Exception as e:
        raise Exception(f"上传图片失败: {str(e)}")

    if 'media_id' not in result:
        raise Exception(f"上传图片失败: {result.get('errmsg', '未知错误')}")

    return result['media_id']


def upload_multiple_images(file_paths):
    """
    批量上传多张图片，返回 media_id 列表
    """
    media_ids = []
    for path in file_paths:
        print(f"  上传图片: {os.path.basename(path)}")
        media_id = upload_permanent_image(path)
        media_ids.append(media_id)
        print(f"  获取到 media_id: {media_id}")
    return media_ids


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python upload_permanent.py <图片路径1> [图片路径2] ...")
        sys.exit(1)

    file_paths = sys.argv[1:]
    media_ids = upload_multiple_images(file_paths)

    print("\n上传完成！")
    print(f"media_id 列表: {json.dumps(media_ids, ensure_ascii=False, indent=2)}")
