package service

import (
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type OGPData struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Image       string `json:"image"`
	URL         string `json:"url"`
}

type OGPService struct {
	client *http.Client
}

func NewOGPService() *OGPService {
	return &OGPService{
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

func (s *OGPService) Fetch(rawURL string) (*OGPData, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid url: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, errors.New("only http/https urls are allowed")
	}
	if err := validateRemoteHost(parsed.Hostname()); err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodGet, parsed.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "OnlySNS-OGP-Bot/1.0")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("failed to fetch metadata: %s", resp.Status)
	}

	doc, err := goquery.NewDocumentFromReader(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}

	meta := &OGPData{URL: parsed.String()}
	meta.Title = pickOGP(doc, []string{"og:title", "twitter:title"}, "title")
	meta.Description = pickOGP(doc, []string{"og:description", "twitter:description", "description"}, "")
	meta.Image = pickOGP(doc, []string{"og:image", "twitter:image"}, "")
	if meta.Image != "" {
		if imgURL, err := url.Parse(meta.Image); err == nil {
			meta.Image = parsed.ResolveReference(imgURL).String()
		}
	}

	if meta.Title == "" && meta.Description == "" && meta.Image == "" {
		return nil, errors.New("no metadata found")
	}
	return meta, nil
}

func pickOGP(doc *goquery.Document, properties []string, fallbackSelector string) string {
	for _, prop := range properties {
		if strings.EqualFold(prop, "description") {
			if v, ok := doc.Find("meta[name='description']").Attr("content"); ok {
				trimmed := strings.TrimSpace(v)
				if trimmed != "" {
					return trimmed
				}
			}
			continue
		}
		if v, ok := doc.Find("meta[property='" + prop + "']").Attr("content"); ok {
			trimmed := strings.TrimSpace(v)
			if trimmed != "" {
				return trimmed
			}
		}
		if v, ok := doc.Find("meta[name='" + prop + "']").Attr("content"); ok {
			trimmed := strings.TrimSpace(v)
			if trimmed != "" {
				return trimmed
			}
		}
	}
	if fallbackSelector != "" {
		trimmed := strings.TrimSpace(doc.Find(fallbackSelector).First().Text())
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func validateRemoteHost(host string) error {
	if host == "" {
		return errors.New("host is required")
	}
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("failed to resolve host: %w", err)
	}
	for _, ip := range ips {
		if isPrivateIP(ip) {
			return errors.New("private or local network addresses are blocked")
		}
	}
	return nil
}

func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
		return true
	}
	if ip4 := ip.To4(); ip4 != nil {
		if ip4[0] == 169 && ip4[1] == 254 {
			return true
		}
	}
	return false
}
