import { http } from "@/request/request";
import { type Album } from "@/server/entity/album";
import { type AlbumAddBo, type AlbumAddPhotoBo, type AlbumDeleteBo, type AlbumRemovePhotoBo, type AlbumSetNameBo, type AlbumSetTopBo, type AlbumSetVisibilityBo, type AlbumShareBo } from "@/server/entity/bo/album";
import { type AlbumShareVo, type AlbumVo } from "@/server/entity/vo/album";

// 这个模块封装相册相关接口请求。

// 查询全部相册列表。
export function albumList() {
  return http.post<AlbumVo[]>('/album/list');
}

// 添加相册。
export function albumAdd(params: AlbumAddBo) {
  return http.post<Album>('/album/add', params);
}

// 给相册添加照片。
export function albumAddPhoto(params: AlbumAddPhotoBo) {
  return http.post<void>('/album/addPhoto', params);
}

// 移除相册中的照片。
export function albumRemovePhoto(params: AlbumRemovePhotoBo) {
  return http.post<void>('/album/removePhoto', params);
}

// 删除相册。
export function albumDelete(params: AlbumDeleteBo) {
  return http.post<void>('/album/delete', params);
}

// 修改相册名称。
export function albumSetName(params: AlbumSetNameBo) {
  return http.post<void>('/album/setName', params);
}

// 置顶相册。
export function albumSetTop(params: AlbumSetTopBo) {
  return http.post<void>('/album/setTop', params);
}

// 设置相册可见性（公开/私密）。
export function albumSetVisibility(params: AlbumSetVisibilityBo) {
  return http.post<void>('/album/setVisibility', params);
}

// 查询回收站虚拟相册。
export function albumTrash() {
  return http.post<AlbumVo>('/album/trash');
}

// 创建或返回相册分享令牌。
export function albumShareCreate(params: AlbumShareBo) {
  return http.post<AlbumShareVo>('/album/share/create', params);
}

// 查询相册分享令牌，未分享时返回 null。
export function albumShareStatus(params: AlbumShareBo) {
  return http.post<AlbumShareVo | null>('/album/share/status', params);
}

// 撤销相册分享。
export function albumShareDelete(params: AlbumShareBo) {
  return http.post<void>('/album/share/delete', params);
}
