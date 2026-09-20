# Name Maker

캐릭터 채팅/창작용 이름 추천 웹페이지입니다. 문화권, 성별, 이름의 vibe를 골라 실제 이름 데이터에서 랜덤 추천합니다.

## 기능
- 일본 / 한국 / 중국 / 영미 / 프랑스 / 독일권 / 이탈리아 / 슬라브·러시아 / 판타지
- 남성 / 여성 / 공용 필터
- 16개 vibe 중 최대 2개 조합
- 같은 문화권 성씨 자동 조합
- 동아시아권 성-이름 순서 적용
- 한글 및 가능한 원어 표기
- 이름 저장(LocalStorage), 복사, 개별 다시 뽑기
- API와 서버 없이 GitHub Pages에서 동작

## 배포
GitHub **Settings → Pages → Deploy from a branch → main / (root)** 로 설정하면 됩니다.

## 데이터
이름 및 성씨의 기반 데이터는 [Behind the Name](https://www.behindthename.com/)에서 제공한 CC BY-SA 4.0 데이터를 사용했습니다. 문화권 그룹핑, 한글/원어 표기, 캐릭터 작명용 vibe는 별도로 가공되었습니다. 자세한 내용은 `DATA_LICENSE.md`를 참고하세요.
