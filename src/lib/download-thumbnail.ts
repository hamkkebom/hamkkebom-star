import { toast } from "sonner";

/**
 * 썸네일 이미지 URL을 받아 파일로 다운로드합니다.
 * @param url 다운로드할 이미지 URL
 * @param filename 저장할 파일명 (예: 영상제목)
 */
export async function downloadThumbnail(url: string | null | undefined, filename: string) {
    if (!url) {
        toast.error("다운로드할 썸네일 이미지가 없습니다.");
        return;
    }

    try {
        const toastId = toast.loading("다운로드 중...");

        // 이미지 Blob 형태로 가져오기
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("이미지를 가져오는데 실패했습니다.");
        }

        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);

        // 강제 다운로드를 위한 anchor 태그 생성
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${filename.replace(/[/\\?%*:|"<>]/g, '-')}_thumbnail.jpg`; // 파일명에 허용되지 않는 문자 치환

        document.body.appendChild(a);
        a.click();

        // 메모리 정리
        document.body.removeChild(a);
        window.URL.revokeObjectURL(objectUrl);

        toast.success("다운로드가 완료되었습니다.", { id: toastId });
    } catch (error) {
        console.error("Thumbnail download error:", error);
        toast.error("다운로드에 실패했습니다. (CORS 또는 네트워크 오류)");
    }
}
