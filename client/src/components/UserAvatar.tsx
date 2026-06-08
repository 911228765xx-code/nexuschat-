/**
 * UserAvatar — 统一头像组件
 * 自动处理两种格式：
 * - CDN URL（以 http 开头）→ 渲染 <img> 图片
 * - emoji / 文字 → 渲染文字 fallback
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  /** 头像值：CDN URL 或 emoji/文字缩写 */
  avatar?: string | null;
  /** 用于 fallback 首字母的名称（当 avatar 是 URL 但加载失败时使用） */
  name?: string | null;
  /** Avatar 容器的额外 className */
  className?: string;
  /** Fallback 的额外 className */
  fallbackClassName?: string;
}

export default function UserAvatar({
  avatar,
  name,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const isUrl = avatar?.startsWith("http");

  // Fallback 文字：URL 时取 name 首字母，否则直接显示 avatar 内容
  const fallbackText = isUrl
    ? (name?.slice(0, 2).toUpperCase() ?? "?")
    : (avatar ?? "?");

  return (
    <Avatar className={cn("shrink-0", className)}>
      {isUrl && (
        <AvatarImage
          src={avatar!}
          alt={name ?? "avatar"}
          className="object-cover"
        />
      )}
      <AvatarFallback className={cn("bg-secondary text-xs", fallbackClassName)}>
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
}
