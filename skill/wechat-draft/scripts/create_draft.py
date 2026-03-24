"""
创建图片消息草稿 (newspic)
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wechat_api import get_access_token, api_request


def create_news_pic_draft(title, digest, media_ids):
    """
    创建图片消息草稿

    Args:
        title: 标题（最多32个字）
        digest: 描述信息（最多128个字）
        media_ids: 图片 media_id 列表（首张为封面）
    """
    if not title:
        raise Exception("标题不能为空")
    if not media_ids:
        raise Exception("至少需要一张图片")

    # 获取 token
    token = get_access_token()

    # 构建图片消息内容
    image_list = [{"image_media_id": mid} for mid in media_ids]

    payload = {
        "articles": [{
            "article_type": "newspic",
            "title": title,
            "digest": digest,
            "image_info": {
                "image_list": image_list
            }
        }]
    }

    url = f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={token}"

    result = api_request(url, method='POST', data=payload, token=None)

    # errcode 为 0 表示成功
    if 'media_id' not in result:
        raise Exception(f"创建草稿失败: {result.get('errmsg', '未知错误')}")

    return result


if __name__ == '__main__':
    # 测试用法
    if len(sys.argv) < 4:
        print("用法: python create_draft.py <标题> <描述> <media_id1> [media_id2] ...")
        sys.exit(1)

    title = sys.argv[1]
    digest = sys.argv[2]
    media_ids = sys.argv[3:]

    print(f"标题: {title}")
    print(f"描述: {digest}")
    print(f"图片数量: {len(media_ids)}")

    result = create_news_pic_draft(title, digest, media_ids)
    print(f"\n创建成功！")
    print(f"草稿 media_id: {result.get('media_id')}")
