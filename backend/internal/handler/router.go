package handler

import (
	"github.com/gin-gonic/gin"
)

func SetupRouter(postHandler *PostHandler) *gin.Engine {
	r := gin.Default()

	r.Use(corsMiddleware())

	r.Static("/uploads", "./uploads")

	api := r.Group("/api/v1")
	{
		api.POST("/posts", postHandler.CreatePost)
		api.GET("/posts", postHandler.ListPosts)
		api.DELETE("/posts/:id", postHandler.DeletePost)
		api.POST("/posts/:id/like", postHandler.LikePost)
		api.POST("/posts/:id/repost", postHandler.RepostPost)
		api.GET("/ogp", postHandler.FetchOGP)
		api.GET("/ai/tsukkomi/latest", postHandler.LatestTsukkomi)
		api.POST("/ai/posts/:id/simplify", postHandler.SimplifyPost)
		api.POST("/ai/posts/:id/quiz", postHandler.GeneratePostQuiz)
		api.GET("/ai/posts/:id/related", postHandler.RelatedPosts)
		api.GET("/search", postHandler.SearchPosts)
		api.GET("/activity", postHandler.GetActivity)
		api.GET("/export", postHandler.ExportPosts)
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
