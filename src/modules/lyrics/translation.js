BetterLyrics.Translation = {
  translateText: function (text, targetLanguage) {
    let url = BetterLyrics.Constants.TRANSLATE_LYRICS_URL(targetLanguage, text);

    return fetch(url)
      .then(response => response.json())
      .then(data => {
        let originalLanguage = data[2];
        let translatedText = "";
        data[0].forEach(part => {
          translatedText += part[0];
        });
        return { originalLanguage, translatedText };
      })
      .catch(error => {
        BetterLyrics.Utils.log(BetterLyrics.Constants.TRANSLATION_ERROR_LOG, error);
        return null;
      });
  },

  onTranslationEnabled: function () {
    BetterLyrics.Storage.getStorage(["isTranslateEnabled", "translationLanguage"], items => {
      if (items.isTranslateEnabled) {
        callback(items);
      }
    });
  },
  getApi : function(callback){
    BetterLyrics.Storage.getStorage("apiValue", items => {
      callback(items);
    });
  },
  translateTextUsingGPT: async function (lyricsText, targetLanguage , apiKey) {

    const url = 'https://api.openai.com/v1/chat/completions';

    return fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `Translate this line into ${targetLanguage}: "${lyricsText}".`
          }
        ]
      })
    })
      .then(response => response.json())
      .then(data => {
        // Process data to extract the original language and translated text
        const translatedText = data.choices[0].message.content.trim();
        const originalLanguage = targetLanguage; // Assuming the target language is what you translate into
        return { originalLanguage, translatedText };
      })
      .catch(error => {
        BetterLyrics.Utils.log(BetterLyrics.Constants.TRANSLATION_ERROR_LOG, error);
        return null;
      });
    },
};
