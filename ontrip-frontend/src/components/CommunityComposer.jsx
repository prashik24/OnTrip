import { useRef } from "react";
import CustomSelect from "./CustomSelect";
import "./CommunityComposer.css";

const postTypeOptions = [
  { label: "Normal Post", value: "post" },
  { label: "Question", value: "question" },
  { label: "Trip Story", value: "trip_story" },
  { label: "Provider Offer", value: "provider_offer" },
];

function previewLabel(file) {
  const isVideo = String(file?.type || "").startsWith("video/");
  return isVideo ? "🎥 Video" : "🖼️ Image";
}

export default function CommunityComposer({
  composer,
  setComposer,
  submitting,
  onCreatePost,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="communityComposerCard">
      <div className="communityComposerHead">
        <div className="communityComposerTitle">Create Post</div>

        <div className="communityComposerType">
          <CustomSelect
            value={composer.postType}
            onChange={(e) =>
              setComposer((prev) => ({ ...prev, postType: e.target.value }))
            }
            options={postTypeOptions}
            placeholder="Select post type"
          />
        </div>
      </div>

      <textarea
        className="communityComposerTextarea"
        placeholder="Share your travel thoughts, ask a question, or post a story..."
        value={composer.text}
        onChange={(e) =>
          setComposer((prev) => ({ ...prev, text: e.target.value }))
        }
        rows={4}
      />

      <div className="communityComposerGrid">
        <input
          type="text"
          className="communityComposerInput"
          placeholder="Location (optional)"
          value={composer.locationText}
          onChange={(e) =>
            setComposer((prev) => ({ ...prev, locationText: e.target.value }))
          }
        />

        <input
          type="text"
          className="communityComposerInput"
          placeholder="Tags comma separated (goa, budget, trip)"
          value={composer.tags}
          onChange={(e) =>
            setComposer((prev) => ({ ...prev, tags: e.target.value }))
          }
        />
      </div>

      <div className="communityComposerActions">
        <button
          type="button"
          className="communityComposerUploadBtn"
          onClick={() => fileInputRef.current?.click()}
        >
          Add Image / Video
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="communityComposerHiddenInput"
          onChange={(e) =>
            setComposer((prev) => ({
              ...prev,
              mediaFiles: Array.from(e.target.files || []),
            }))
          }
        />

        <div className="communityComposerSelectedText">
          {composer.mediaFiles.length > 0
            ? `${composer.mediaFiles.length} file(s) selected`
            : "No files selected"}
        </div>

        <button
          type="button"
          className="communityComposerPostBtn"
          onClick={onCreatePost}
          disabled={submitting}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>

      {composer.mediaFiles.length > 0 ? (
        <div className="communityComposerPreviewGrid">
          {composer.mediaFiles.map((file, index) => {
            const objectUrl = URL.createObjectURL(file);
            const isVideo = String(file.type || "").startsWith("video/");

            return (
              <div className="communityComposerPreviewCard" key={`${file.name}-${index}`}>
                <div className="communityComposerPreviewTop">
                  <span>{previewLabel(file)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setComposer((prev) => ({
                        ...prev,
                        mediaFiles: prev.mediaFiles.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>

                {isVideo ? (
                  <video
                    src={objectUrl}
                    controls
                    className="communityComposerPreviewMedia"
                  />
                ) : (
                  <img
                    src={objectUrl}
                    alt={file.name}
                    className="communityComposerPreviewMedia"
                  />
                )}

                <div className="communityComposerPreviewName">{file.name}</div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}