package handler

import (
	"github.com/gin-gonic/gin"
)

func SetupRouter(postHandler *PostHandler, aiHandler *AIHandler, analyzeHandler *AnalyzeHandler) *gin.Engine {
	r := gin.Default()

	r.Use(corsMiddleware())

	r.Static("/uploads", "./uploads")

	api := r.Group("/api/v1")
	{
		api.POST("/posts", postHandler.CreatePost)
		api.GET("/posts", postHandler.ListPosts)
		api.DELETE("/posts/:id", postHandler.DeletePost)
		api.POST("/posts/:id/like", postHandler.LikePost)
		api.DELETE("/posts/:id/like", postHandler.UnlikePost)
		api.GET("/search", postHandler.SearchPosts)
		api.GET("/activity", postHandler.GetActivity)
		api.GET("/export", postHandler.ExportPosts)

		api.GET("/ogp", FetchOGP)

		api.POST("/ai/code-review", aiHandler.CodeReview)
		api.POST("/ai/summarize", aiHandler.Summarize)
		api.POST("/ai/extract-entities", aiHandler.ExtractEntities)
		api.POST("/ai/next-step", aiHandler.NextStep)
		api.POST("/ai/caption", aiHandler.Caption)

		api.POST("/analyze/text", analyzeHandler.AnalyzeText)
	}

	return r
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

