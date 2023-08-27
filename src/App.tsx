import React, { useState, useEffect, useRef } from "react";
import { pdfjs, Document, Page } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import {
  PdfLoader,
  PdfHighlighter,
  Tip,
  Highlight,
  Popup,
  AreaHighlight,
} from "react-pdf-highlighter";

import type { IHighlight, NewHighlight } from "react-pdf-highlighter";

import { testHighlights as _testHighlights } from "./test-highlights";
import { Spinner } from "./Spinner";
import { Sidebar } from "./Sidebar";

import "./style/App.css";

type PDFFile = string | File | null;
const options = {
  cMapUrl: "cmaps/",
  standardFontDataUrl: "standard_fonts/",
};

// - ----------
const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021.pdf";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480.pdf";

const searchParams = new URLSearchParams(document.location.search);

const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

function App() {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

  const [file, setFile] = useState<PDFFile>(PRIMARY_PDF_URL);
  console.log({ file });

  const [numPages, setNumPages] = useState<number>();

  const [url, setUrl] = useState<string>(initialUrl);
  const [highlights, setHighlights] = useState<Array<IHighlight>>(
    testHighlights[initialUrl] ? [...testHighlights[initialUrl]] : []
  );
  const stateRef = useRef<IHighlight[]>([]);
  stateRef.current = highlights;

  // ------------------
  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    console.log({ files });
    if (files && files[0]) {
      setFile(URL.createObjectURL(files[0]) || null);
      setHighlights([]);
    }
  }
  function onDocumentLoadSuccess({ numPages }: { numPages: any }) {
    setNumPages(numPages);
  }
  // ------------------

  const resetHighlights = () => {
    setHighlights([]);
  };

  const toggleDocument = () => {
    const newUrl =
      url === PRIMARY_PDF_URL ? SECONDARY_PDF_URL : PRIMARY_PDF_URL;
    const newHigh = testHighlights[newUrl] ? [...testHighlights[newUrl]] : [];
    setUrl(newUrl);
    setHighlights(newHigh);
  };
  let scrollViewerTo = (highlight: any) => {
    //
  };
  const scrollToHighlightFromHash = () => {
    const highlight = getHighlightById(parseIdFromHash());
    console.log({ highlight });
    if (highlight) {
      scrollViewerTo(highlight);
    }
  };
  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);

    return () => {
      window.removeEventListener(
        "hashchange",
        scrollToHighlightFromHash,
        false
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  function getHighlightById(id: string) {
    return stateRef?.current?.find((highlight) => highlight.id === id);
  }

  function addHighlight(highlight: NewHighlight) {
    // console.log({ highlight });

    console.log("Saving highlight", highlight);
    setHighlights((prev) => [{ ...highlight, id: getNextId() }, ...prev]);
  }

  function updateHighlight(
    highlightId: string,
    position: Object,
    content: Object
  ) {
    console.log("Updating highlight", highlightId, position, content);
    setHighlights(
      highlights.map((h) => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          ...rest
        } = h;
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest,
            }
          : h;
      })
    );
  }

  // console.log({ highlights });

  return (
    <div className="App">
      <div className="upload-btn-wrapper">
        <button className="btn">Upload a PDF file</button>
        <input type="file" onChange={onFileChange} name="myfile" />
      </div>

      <div style={{ display: "flex", height: "100vh" }}>
        {/* <div>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          options={options}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <Page key={`page_${index + 1}`} pageNumber={index + 1} />
          ))}
        </Document>
      </div> */}
        <Sidebar
          highlights={highlights}
          resetHighlights={resetHighlights}
          toggleDocument={toggleDocument}
        />
        <div
          style={{
            height: "100vh",
            width: "75vw",
            position: "relative",
          }}
        >
          {/* @ts-expect-error Server Component */}
          <PdfLoader url={file} beforeLoad={<Spinner />}>
            {(pdfDocument) => (
              <>
                {/* @ts-expect-error Server Component */}
                <PdfHighlighter
                  pdfDocument={pdfDocument}
                  enableAreaSelection={(event) => event.altKey}
                  onScrollChange={resetHash}
                  // pdfScaleValue="page-width"
                  scrollRef={(scrollTo) => {
                    scrollViewerTo = scrollTo;

                    scrollToHighlightFromHash();
                  }}
                  onSelectionFinished={(
                    position,
                    content,
                    hideTipAndSelection,
                    transformSelection
                  ) => (
                    <>
                      {/* @ts-expect-error Server Component */}
                      <Tip
                        onOpen={transformSelection}
                        onConfirm={(comment) => {
                          addHighlight({ content, position, comment });

                          hideTipAndSelection();
                        }}
                      />
                    </>
                  )}
                  highlightTransform={(
                    highlight,
                    index,
                    setTip,
                    hideTip,
                    viewportToScaled,
                    screenshot,
                    isScrolledTo
                  ) => {
                    const isTextHighlight = !Boolean(
                      highlight.content && highlight.content.image
                    );

                    const component = isTextHighlight ? (
                      <>
                        {/* @ts-expect-error Server Component */}
                        <Highlight
                          isScrolledTo={isScrolledTo}
                          position={highlight.position}
                          comment={highlight.comment}
                        />
                      </>
                    ) : (
                      <>
                        {/* @ts-expect-error Server Component */}
                        <AreaHighlight
                          isScrolledTo={isScrolledTo}
                          highlight={highlight}
                          onChange={(boundingRect) => {
                            updateHighlight(
                              highlight.id,
                              { boundingRect: viewportToScaled(boundingRect) },
                              { image: screenshot(boundingRect) }
                            );
                          }}
                        />
                      </>
                    );

                    return (
                      <>
                        {/* @ts-expect-error Server Component */}
                        <Popup
                          popupContent={<HighlightPopup {...highlight} />}
                          onMouseOver={(popupContent) =>
                            setTip(highlight, (highlight) => popupContent)
                          }
                          onMouseOut={hideTip}
                          key={index}
                          children={component}
                        />
                      </>
                    );
                  }}
                  highlights={highlights}
                />
              </>
            )}
          </PdfLoader>
        </div>
      </div>
    </div>
  );
}

export default App;
