package vo

type CacheKeyStatus struct {
	Key        string `json:"key"`
	Exists     bool   `json:"exists"`
	TTLSeconds int64  `json:"ttl_seconds"`
}

type CacheCounterStatus struct {
	Key        string `json:"key"`
	Exists     bool   `json:"exists"`
	TTLSeconds int64  `json:"ttl_seconds"`
	Value      int64  `json:"value"`
}

type CacheRankStatus struct {
	Key    string  `json:"key"`
	Exists bool    `json:"exists"`
	Score  float64 `json:"score"`
}

type PostCacheStatus struct {
	PostID        uint64             `json:"post_id"`
	PostDetail    CacheKeyStatus     `json:"post_detail"`
	PostViewCount CacheCounterStatus `json:"post_view_count"`
	Comments      CacheKeyStatus     `json:"comments"`
	HotRank       CacheRankStatus    `json:"hot_rank"`
}
