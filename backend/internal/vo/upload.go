package vo

type UploadedMedia struct {
	MediaType    string `json:"media_type"`
	URL          string `json:"url"`
	OriginalName string `json:"original_name"`
	MimeType     string `json:"mime_type"`
	SizeBytes    int64  `json:"size_bytes"`
}
