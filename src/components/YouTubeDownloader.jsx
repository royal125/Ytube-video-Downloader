import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Tabs,
  Tab,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import axios from "axios";
import Lottie from "lottie-react";
import loaderAnim from "./assets/loader.json";
import spinnerAnim from "./assets/spinner.json"; // or whatever file name you used
import DownloadCell from "./FormatsSection/DownloadCell"; // a small helper component for download button

import "./style.css";

// Optional custom components (comment these out if you don’t have them)
import CategoryButtons from "./CategoryButtons";
import FeaturesSection from "./FeaturesSection";
import CarouselSection from "./CarouselSection";

const API_BASE = "https://api.savefrom.in"; // ✅ backend domain
await axios.get(`${API_BASE}/api/info`, { params: { url } });
// your backend subdomain


const YouTubeDownloader = () => {
  const [url, setUrl] = useState("");
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [downloadingMap, setDownloadingMap] = useState({});

  // ---- helpers -------------------------------------------------------------
  const normalizeFormats = (raw) => {
    const list = Array.isArray(raw) ? raw : [];
    // infer type if missing; prefer explicit flags if your API sends them
    const withTypes = list.map((f) => {
      const hasVideo = f.type === "video" || !!f.height || !!f.vcodec;
      const hasAudio = f.type === "audio" || !!f.abr || !!f.acodec;
      return { ...f, type: hasVideo && !hasAudio ? "video" : hasAudio && !hasVideo ? "audio" : (f.type || "video") };
    });

    // dedupe by format_id first, otherwise by (ext + qualityLabel + abr/height)
    const seen = new Set();
    const keyOf = (f) =>
      f.format_id ??
      `${f.type}|${f.ext}|${f.qualityLabel || ""}|${f.abr || ""}|${f.height || ""}`;

    return withTypes.filter((f) => {
      const k = keyOf(f);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const videoFormats = normalizeFormats(videoData?.formats).filter((f) => f.type === "video");
  const audioFormats = normalizeFormats(videoData?.formats).filter((f) => f.type === "audio");

  // clear any spinner if user came back to tab (likely download started)
  useEffect(() => {
    const onFocus = () => setDownloadingMap({});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // ---- actions -------------------------------------------------------------
 const handleFetch = async () => {
  if (!url.trim()) return;
  setLoading(true);
  setVideoData(null);

  try {
    // 🔹 Try GET first
    const res = await axios.get(`${API_BASE}/api/info`, {
      params: { url },
    });

    setVideoData(res.data || {});
  } catch (err) {
    console.warn("GET failed, trying POST...");

    // 🔹 Fallback to POST (in case GET blocked or CORS)
    try {
      const res = await axios.post(`${API_BASE}/api/info`, { url });
      setVideoData(res.data || {});
    } catch (err2) {
      console.error("❌ Failed to fetch video info:", err2);
      alert("Failed to fetch video info. Please check the URL or try again later.");
      setVideoData({});
    }
  } finally {
    setLoading(false);
  }
};


  const handleEnter = (e) => {
    if (e.key === "Enter") handleFetch();
  };

// ---------------------------- handleDownload ------------------------------//

const handleDownload = async (format) => {
  const id =
    format.format_id ||
    `${format.type}-${format.ext}-${format.qualityLabel || ""}`;

  setDownloadingMap((prev) => ({ ...prev, [id]: true }));

  try {
    // 🔹 Build the download URL
    const downloadUrl = `${API_BASE}/api/download?url=${encodeURIComponent(url)}&format_id=${
      format.format_id ?? ""
    }&title=${encodeURIComponent(videoData?.title || "video")}&type=${encodeURIComponent(
      format.type
    )}`;

    console.log("🎬 Download URL:", downloadUrl);

    // 🔹 Request the file from backend
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`Failed (${response.status})`);

    // 🔹 Turn into blob (file)
    const blob = await response.blob();
    const ext = format.type === "audio" ? ".mp3" : ".mp4";
    const filename = (videoData?.title || "video") + ext;

    // 🔹 Create invisible link to trigger download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // 🔹 Cleanup
    link.remove();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error("❌ Download failed:", err);
    alert("Download failed. Please try again.");
  } finally {
    setDownloadingMap((prev) => ({ ...prev, [id]: false }));
  }
};


  // ---- render -----------------------------FETCHING HERERERERERERER---------------------------------
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom textAlign="center">
        🎬 YouTube Video Downloader
      </Typography>

      <Box display="flex" gap={2} mb={1} justifyContent="center">
        <TextField
          label="Paste YouTube URL"
          variant="outlined"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleEnter}
          sx={{ width: "70%", backgroundColor: "white", borderRadius: 1 }}
        />
        <Button className="bt-fetch" variant="contained" color="secondary" onClick={handleFetch} disabled={loading || !url.trim()}>
          Fetch
        </Button>





      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" mt={2} mb={3}>
          <Lottie animationData={loaderAnim} loop autoplay style={{ height: 120, width: 120 }} />
        </Box>
      )}

      {videoData && (
        <>
          {(videoData.thumbnail || videoData.title) && (
            <Box textAlign="center" mb={3}>
              {videoData.thumbnail && (
                <img
                  src={videoData.thumbnail}
                  alt="Thumbnail"
                  style={{ maxWidth: "320px", borderRadius: "12px", marginBottom: "10px" }}
                />
              )}
              {videoData.title && <Typography variant="h6">{videoData.title}</Typography>}
            </Box>
          )}

          <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 2 }}>
            <Tab label="Video" />
            <Tab label="Audio" />
          </Tabs>

          {tab === 0 && (
            <>
              {videoFormats.length === 0 ? (
                <Paper sx={{ p: 2, textAlign: "center" }}>No video formats found.</Paper>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Quality</TableCell>
                        <TableCell>Format</TableCell>
                        <TableCell>Size (MB)</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {videoFormats.map((format) => {
                        const id = format.format_id || `${format.type}-${format.ext}-${format.qualityLabel || ""}`;
                        return (
                          <TableRow key={id}>
                            <TableCell>{format.qualityLabel || `${format.height || ""}p`}</TableCell>
                            <TableCell>{format.ext || "—"}</TableCell>
                            <TableCell>{format.size ?? "—"}</TableCell>
                            <TableCell>
                              {downloadingMap[id] ? (
                                <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 40 }}>
                                  <Lottie animationData={spinnerAnim} loop autoplay style={{ height: 40, width: 40 }} />
                                </Box>
                              ) : (
                               <Button
  variant="contained"
  color="primary"
  component="a"
  href={`${API_BASE}/api/download?url=${encodeURIComponent(url)}&format_id=${encodeURIComponent(
    format.format_id ?? ""
  )}&title=${encodeURIComponent(videoData?.title || "video")}&type=${encodeURIComponent(
    format.type
  )}`}

  rel="noopener noreferrer"
  onClick={() => {
    setDownloadingMap((prev) => ({ ...prev, [format.format_id]: true }));
    setTimeout(() => {
      setDownloadingMap((prev) => ({ ...prev, [format.format_id]: false }));
    }, 15000);
  }}
>
  {downloadingMap[format.format_id] ? "Preparing..." : "Download"}
</Button>

                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}

          {tab === 1 && (
            <>
              {audioFormats.length === 0 ? (
                <Paper sx={{ p: 2, textAlign: "center" }}>No audio formats found.</Paper>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Bitrate</TableCell>
                        <TableCell>Format</TableCell>
                        <TableCell>Size (MB)</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {audioFormats.map((format) => {
                        const id = format.format_id || `${format.type}-${format.ext}-${format.qualityLabel || ""}`;
                        return (
                          <TableRow key={id}>
                            <TableCell>{format.qualityLabel || `${format.abr || ""}kbps`}</TableCell>
                            <TableCell>{format.ext || "—"}</TableCell>
                            <TableCell>{format.size ?? "—"}</TableCell>
                            <TableCell>
                              <DownloadCell
                                format={format}
                                downloadingMap={downloadingMap}
                                handleDownload={handleDownload}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </>
      )}

      <CategoryButtons />
      <FeaturesSection />
      <CarouselSection />
    </Container>
  );
};

export default YouTubeDownloader;