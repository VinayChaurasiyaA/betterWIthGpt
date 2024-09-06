
BetterLyrics.Lyrics = {
  createLyrics: function () {
    BetterLyrics.DOM.requestSongInfo(async e => {
      const song = e.song;
      const artist = e.artist;
      BetterLyrics.Utils.log(BetterLyrics.Constants.FETCH_LYRICS_LOG, song, artist);

      const url = `${BetterLyrics.Constants.LYRICS_API_URL}?s=${encodeURIComponent(BetterLyrics.Utils.unEntity(song))}&a=${encodeURIComponent(BetterLyrics.Utils.unEntity(artist))}`;

      const apiKey = await new Promise((resolve) => {
        chrome.storage.sync.get(['apiValue'], (result) => {
          resolve(result.apiValue);
        });
      });
    
      if (!apiKey) {
        console.error("GPT API key not found in storage");
      }
      console.log('API Key:', apiKey);

      const targetLanguage = await new Promise((resolve) => {
        chrome.storage.sync.get(['translationLanguage'], (result) => {
          resolve(result.translationLanguage);
        });
      }) || "en";

      const translationEnable = await new Promise((resolve) => {
        chrome.storage.sync.get(['isTranslateEnabled'], (result) => {
          resolve(result.isTranslateEnabled);
        });
      }) || false;

      console.log('Translation Language:', targetLanguage);
      console.log('Translation Enabled:', translationEnable);
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return response.json();
        })
        .then(async data => {
          let lyrics = data.lyrics;
          console.log('Original Lyrics:', lyrics);
          // TODO: Implement translation using GPT
          if(lyrics && lyrics.length !== 0 && translationEnable){
            const translatedLyrics = await BetterLyrics.Translation.translateTextUsingGPT(lyrics, targetLanguage, apiKey);
            if (translatedLyrics) {
              lyrics = translatedLyrics; // Assign translated lyrics if available
            }
          }
          console.log('Lyrics:', lyrics);
          BetterLyrics.App.lang = data.language;
          BetterLyrics.DOM.setRtlAttributes(data.isRtlLanguage);

          clearInterval(BetterLyrics.App.lyricsCheckInterval);

          if (!lyrics || lyrics.length === 0) {
            BetterLyrics.Utils.log(BetterLyrics.Constants.NO_LYRICS_FOUND_LOG);
            setTimeout(BetterLyrics.DOM.injectError, 500);
            return;
          }

          BetterLyrics.Utils.log(BetterLyrics.Constants.LYRICS_FOUND_LOG);
          try {
            const lyricsElement = document.getElementsByClassName(BetterLyrics.Constants.LYRICS_CLASS)[0];
            lyricsElement.innerHTML = "";
          } catch (_err) {
            BetterLyrics.Utils.log(BetterLyrics.Constants.LYRICS_TAB_NOT_DISABLED_LOG);
          }
          BetterLyrics.Lyrics.injectLyrics(lyrics , translationEnable , targetLanguage);
        })
        .catch(err => {
          clearInterval(BetterLyrics.App.lyricsCheckInterval);
          BetterLyrics.Utils.log(BetterLyrics.Constants.SERVER_ERROR_LOG);
          BetterLyrics.Utils.log(err);
          setTimeout(BetterLyrics.DOM.injectError, 500);
        });
    });
  },

  injectLyrics: async function (lyrics , translationEnable , targetLanguage) {
    let lyricsWrapper = BetterLyrics.DOM.createLyricsWrapper();
    BetterLyrics.DOM.addFooter();

    try {
      lyricsWrapper.innerHTML = "";
      const lyricsContainer = document.createElement("div");
      lyricsContainer.className = BetterLyrics.Constants.LYRICS_CLASS;
      lyricsWrapper.appendChild(lyricsContainer);
      BetterLyrics.DOM.flushLoader();

      lyricsWrapper.removeAttribute("is-empty");
    } catch (_err) {
      BetterLyrics.Utils.log(BetterLyrics.Constants.LYRICS_WRAPPER_NOT_VISIBLE_LOG);
    }

    BetterLyrics.Translation.onTranslationEnabled(items => {
      BetterLyrics.Utils.log(BetterLyrics.Constants.TRANSLATION_ENABLED_LOG, items.translationLanguage);
    });

    const allZero = lyrics.every(item => item.startTimeMs === "0");
    // let apiKey;
    // try this out!
    
    // const target_language = "en";
    // const translatedValues = BetterLyrics.Translation.translateTextUsingGPT(lyrics, target_language, apiKey);
    // console.log(translatedValues);
    // lyrics should be in the down size instead of being at the important so it might work
    // if there is anything it would work
    // if(apiKey !== null || apiKey || undefined || apiKey !== ""){
      // BetterLyrics.Translation.onTranslationEnabled(items => {
      //   target_language = items.translationLanguage || "en";
      // });
      
      // let source_language = BetterLyrics.App.lang ?? "en";
      // if (source_language !== target_language) {
      //   BetterLyrics.Translation.translateTextUsingGPT(lyrics, target_language, apiKey).then(translatedLyrics => {
      //     if (translatedLyrics) {
      //       translatedLyrics.forEach((translatedLineObj) => {
      //         let translatedLine = document.createElement("span");
      //         translatedLine.classList.add(BetterLyrics.Constants.TRANSLATED_LYRICS_CLASS);
    
      //         if (translatedLineObj.translatedLines.trim() !== "♪" && translatedLineObj.translatedLines.trim() !== "") {
      //           translatedLine.textContent = "\n" + translatedLineObj.translatedLines;
      //           line.appendChild(translatedLine);
      //         } else {
      //           translatedLine.textContent = "\n" + "—";
      //           line.appendChild(translatedLine);
      //         }
      //       });
      //     } else {
      //       // Handle translation failure
      //       console.error("Translation failed.");
      //     }
      //   }).catch(error => {
      //     console.error("Translation error:", error);
      //   });
      // }
    // }
    // const value = BetterLyrics.Translation.translateTextUsingGPT(lyrics, target_language, apiKey);
    // console.log(value);
    // console.log("original lyrics:" , lyrics);

    lyrics.forEach(item => {
      let line = document.createElement("div");
      line.dataset.time = item.startTimeMs / 1000;
      line.style = "--blyrics-duration: " + item.durationMs / 1000 + "s;";

      const words = item.words.split(" ");

      if (!allZero) {
        line.setAttribute("data-scrolled", false);
        line.setAttribute(
          "onClick",
          `const player = document.getElementById("movie_player"); player.seekTo(${
            item.startTimeMs / 1000
          }, true);player.playVideo();`
        );
      } else {
        line.classList.add(BetterLyrics.Constants.CURRENT_LYRICS_CLASS);
      }

      words.forEach((word, index) => {
        let span = document.createElement("span");
        span.style.transitionDelay = `${index * 0.05}s`;
        span.style.animationDelay = `${index * 0.05}s`;
        span.textContent = words.length <= 1 ? word : word + " ";
        line.appendChild(span);
      });

      // console.log("Items hai idhar: 0" , JSON.stringify(words));
      if (translationEnable) {
        // lyrics.forEach((item) => {
          // console.log("Items hai idhar: 1", JSON.stringify(item));
          let translatedLine = document.createElement("span");
          translatedLine.classList.add(BetterLyrics.Constants.TRANSLATED_LYRICS_CLASS);
      
          if (item.words.trim() !== "♪" && item.words.trim() !== "") {
            // Only call translateText if the translatedLine is not already present
            if (!item.translatedLines) {
              BetterLyrics.Translation.translateText(item.words, targetLanguage).then((result) => {
                if (result && result.originalLanguage !== targetLanguage) {
                  // console.log("Items hai idhar: 2", JSON.stringify(result));
                  translatedLine.textContent = result.translatedText; // Only set the translated text
                  line.appendChild(translatedLine); // Append the translated line immediately
                }
              });
            } else {
              // If translatedLine is already present, use it directly
              // console.log("Items hai idhar: 3", JSON.stringify(item.translatedLines));
              translatedLine.textContent = item.translatedLines;
              line.appendChild(translatedLine); // Append the translated line immediately
            }
          }
        // });
      }
      

      // BetterLyrics.Translation.onTranslationEnabled((items) => {
      //   console.log("Items hai idhar: primary" , items);
      //   console.log("Items hai idhar: primary 1" , JSON.stringify(items));
      //   items.forEach((item) => {
      //     console.log("Items hai idhar: 1" , JSON.stringify(item)); // it should give me something that whether I am getting anything or not
      //     console.log("Items hai idhar: 2" , item); // it should give me something that whether I am getting anything or not
      //     console.log("Items hai idhar 3: " , item.json()); // it should give me something that whether I am getting anything or not
      //     let translatedLine = document.createElement("span");
      //     translatedLine.classList.add(BetterLyrics.Constants.TRANSLATED_LYRICS_CLASS);
      
      //     let source_language = BetterLyrics.App.lang ?? "en";
      //     let target_language = items.translationLanguage || "en";
      
      //     // Check if a translation is needed
      //     if (source_language !== target_language) {
      //       if (item.words.trim() !== "♪" && item.words.trim() !== "") {
      //         // Only call translateText if the translatedLine is not already present
      //         if (!item.translatedLines) {
      //           BetterLyrics.Translation.translateText(item.words, target_language).then((result) => {
      //             if (result) {
      //               if (result.originalLanguage !== target_language) {
      //                 translatedLine.textContent = "\n" + result.translatedText;
      //                 line.appendChild(translatedLine);
      //               }
      //             } else {
      //               translatedLine.textContent = "\n" + "—";
      //               line.appendChild(translatedLine);
      //             }
      //           });
      //         } else {
      //           // If translatedLine is already present, use it directly
      //           translatedLine.textContent = "\n" + item.translatedLines;
      //           line.appendChild(translatedLine);
      //         }
      //       }
      //     }
      //   });
      // });
      

      try {
        document.getElementsByClassName(BetterLyrics.Constants.LYRICS_CLASS)[0].appendChild(line);
      } catch (_err) {
        BetterLyrics.Utils.log(BetterLyrics.Constants.LYRICS_WRAPPER_NOT_VISIBLE_LOG);
      }
    });

    if (!allZero) {
      BetterLyrics.Lyrics.setupLyricsCheckInterval();
    } else {
      BetterLyrics.Utils.log(BetterLyrics.Constants.SYNC_DISABLED_LOG);
    }
  },

  setupLyricsCheckInterval: function () {
    BetterLyrics.App.lyricsCheckInterval = setInterval(function () {
      if (BetterLyrics.DOM.isLoaderActive()) {
        BetterLyrics.Utils.log(BetterLyrics.Constants.LOADER_ACTIVE_LOG);
        return;
      }
      try {
        let currentTime =
          BetterLyrics.Utils.timeToInt(
            document
              .getElementsByClassName(BetterLyrics.Constants.TIME_INFO_CLASS)[0]
              .innerHTML.replaceAll(" ", "")
              .replaceAll("\n", "")
              .split("/")[0]
          ) + 0.75;
        const lyrics = [...document.getElementsByClassName(BetterLyrics.Constants.LYRICS_CLASS)[0].children];

        lyrics.every((elem, index) => {
          const time = parseFloat(elem.getAttribute("data-time"));

          if (currentTime >= time && index + 1 === lyrics.length && elem.getAttribute("data-scrolled") !== "true") {
            elem.setAttribute("class", BetterLyrics.Constants.CURRENT_LYRICS_CLASS);
            elem.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "center",
            });
            elem.setAttribute("data-scrolled", true);
            return true;
          } else if (currentTime > time && currentTime < parseFloat(lyrics[index + 1].getAttribute("data-time"))) {
            const current = document.getElementsByClassName(BetterLyrics.Constants.CURRENT_LYRICS_CLASS)[0];
            elem.setAttribute("class", BetterLyrics.Constants.CURRENT_LYRICS_CLASS);
            if (current !== undefined && current.getAttribute("data-scrolled") !== "true") {
              current.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center",
              });
              current.setAttribute("data-scrolled", true);
            }
            return true;
          } else {
            elem.setAttribute("data-scrolled", false);
            elem.setAttribute("class", "");
            return true;
          }
        });
      } catch (err) {
        BetterLyrics.Utils.log(err);
        return true;
      }
    }, 50);
  },
};
