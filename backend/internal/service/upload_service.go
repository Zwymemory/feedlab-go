package service

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"feedlab/backend/internal/vo"
)

const (
	maxImageUploadBytes = 5 * 1024 * 1024
	maxVideoUploadBytes = 50 * 1024 * 1024
)

type UploadService struct {
	rootDir string
}

func NewUploadService(rootDir string) *UploadService {
	if strings.TrimSpace(rootDir) == "" {
		rootDir = "uploads"
	}
	return &UploadService{rootDir: rootDir}
}

func (s *UploadService) SaveMedia(file *multipart.FileHeader) (*vo.UploadedMedia, error) {
	if file == nil || file.Size <= 0 {
		return nil, ErrBadRequest
	}

	mediaType, ext, mimeType, err := inspectUpload(file)
	if err != nil {
		return nil, err
	}
	if mediaType == "image" && file.Size > maxImageUploadBytes {
		return nil, ErrBadRequest
	}
	if mediaType == "video" && file.Size > maxVideoUploadBytes {
		return nil, ErrBadRequest
	}

	now := time.Now()
	relativeDir := filepath.Join(
		strconvYear(now),
		strconvMonth(now),
	)
	targetDir := filepath.Join(s.rootDir, relativeDir)
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return nil, err
	}

	fileName, err := randomFileName(ext)
	if err != nil {
		return nil, err
	}
	targetPath := filepath.Join(targetDir, fileName)
	if err := copyUpload(file, targetPath); err != nil {
		return nil, err
	}

	url := "/" + filepath.ToSlash(filepath.Join(s.rootDir, relativeDir, fileName))
	return &vo.UploadedMedia{
		MediaType:    mediaType,
		URL:          url,
		OriginalName: filepath.Base(file.Filename),
		MimeType:     mimeType,
		SizeBytes:    file.Size,
	}, nil
}

func inspectUpload(file *multipart.FileHeader) (string, string, string, error) {
	ext := strings.ToLower(filepath.Ext(file.Filename))
	source, err := file.Open()
	if err != nil {
		return "", "", "", err
	}
	defer source.Close()

	buffer := make([]byte, 512)
	n, err := source.Read(buffer)
	if err != nil && err != io.EOF {
		return "", "", "", err
	}
	detected := http.DetectContentType(buffer[:n])
	headerMime := strings.ToLower(file.Header.Get("Content-Type"))
	mimeType := detected
	if headerMime != "" && headerMime != "application/octet-stream" {
		mimeType = headerMime
	}

	if isAllowedImage(ext, detected, headerMime) {
		return "image", ext, mimeType, nil
	}
	if isAllowedVideo(ext, detected, headerMime) {
		return "video", ext, mimeType, nil
	}
	return "", "", "", ErrBadRequest
}

func isAllowedImage(ext string, detected string, headerMime string) bool {
	allowedExt := ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" || ext == ".gif"
	return allowedExt && (strings.HasPrefix(detected, "image/") || strings.HasPrefix(headerMime, "image/"))
}

func isAllowedVideo(ext string, detected string, headerMime string) bool {
	allowedExt := ext == ".mp4" || ext == ".webm" || ext == ".mov"
	return allowedExt && (strings.HasPrefix(detected, "video/") || strings.HasPrefix(headerMime, "video/") || detected == "application/octet-stream")
}

func copyUpload(file *multipart.FileHeader, targetPath string) error {
	source, err := file.Open()
	if err != nil {
		return err
	}
	defer source.Close()

	target, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return err
	}
	defer target.Close()

	_, err = io.Copy(target, source)
	return err
}

func randomFileName(ext string) (string, error) {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw) + ext, nil
}

func strconvYear(t time.Time) string {
	return t.Format("2006")
}

func strconvMonth(t time.Time) string {
	return t.Format("01")
}
