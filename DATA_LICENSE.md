# Data attribution and license

The given-name and surname source data used by this project originates from **Behind the Name** (https://www.behindthename.com/) and is provided under the **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)** license.

License: https://creativecommons.org/licenses/by-sa/4.0/

This project contains adaptations/derived metadata for character naming, including culture-group classification, Korean display forms, selected native-script forms, and subjective vibe tags. Data adaptations are distributed under CC BY-SA 4.0 in accordance with the source license.

Website source code is separate from the dataset licensing described above.

## Additional derived-data sources

- **Japanese Personal Name Dataset** by shuheilocale: used to repair missing Japanese kana/kanji variants. MIT License.
  https://github.com/shuheilocale/japanese-personal-name-dataset
- **cyrillic-transliteration** by Open Data Kosovo: consulted for region-specific Cyrillic transliteration conventions used when rebuilding Russian/Ukrainian/Belarusian/Bulgarian/Macedonian/Serbian native forms. MIT License.
  https://github.com/opendatakosovo/cyrillic-transliteration

The project-specific `native_by_region` and `hangul_by_region` fields are derived metadata intended to prevent multi-region names from losing culture-specific display forms.
