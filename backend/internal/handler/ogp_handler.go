package handler

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/html"
)

func FetchOGP(c *gin.Context) {
	rawURL := c.Query("url")
	if rawURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
		return
	}

	parsedURL, err := url.ParseRequestURI(rawURL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid url"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to create request"})
		return
	}
	req.Header.Set("User-Agent", "OnlySNS/1.0 OGP-Fetcher")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to fetch url"})
		return
	}
	defer resp.Body.Close()

	doc, err := html.Parse(resp.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to parse html"})
		return
	}

	var ogTitle, ogDesc, ogImage, titleTag string

	var traverse func(*html.Node)
	traverse = func(n *html.Node) {
		if n.Type == html.ElementNode {
			if n.Data == "meta" {
				prop := getAttr(n, "property")
				name := getAttr(n, "name")
				content := getAttr(n, "content")
				switch {
				case prop == "og:title":
					ogTitle = content
				case prop == "og:description":
					ogDesc = content
				case prop == "og:image":
					ogImage = content
				case name == "description" && ogDesc == "":
					ogDesc = content
				}
			} else if n.Data == "title" && titleTag == "" {
				if n.FirstChild != nil {
					titleTag = n.FirstChild.Data
				}
			}
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			traverse(child)
		}
	}
	traverse(doc)

	title := ogTitle
	if title == "" {
		title = titleTag
	}

	if ogImage != "" && !strings.HasPrefix(ogImage, "http") {
		base := parsedURL.Scheme + "://" + parsedURL.Host
		if !strings.HasPrefix(ogImage, "/") {
			ogImage = base + "/" + ogImage
		} else {
			ogImage = base + ogImage
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"title":       title,
		"description": ogDesc,
		"image":       ogImage,
		"url":         rawURL,
	})
}

func getAttr(n *html.Node, key string) string {
	for _, a := range n.Attr {
		if a.Key == key {
			return a.Val
		}
	}
	return ""
}
