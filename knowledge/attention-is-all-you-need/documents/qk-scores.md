# 내적 — 참고할 비중의 점수

내적은 같은 길이의 두 벡터에서 같은 위치의 숫자끼리 곱한 뒤 더하는 연산입니다.

```text
[1, 2] · [3, 4] = 1×3 + 2×4 = 11
```

## 공통 예제를 계산합니다

Query가 `[1, 0]`이고 두 Key가 `[1, 0]`, `[0, 1]`이면 점수는 각각 1과 0입니다. 첫 번째 Key에 더 높은 점수가 생겼습니다. 아직 확률이 아니므로 음수도 가능하고 합이 1일 필요도 없습니다.

## QKᵀ는 무엇을 한꺼번에 계산하나요?

Q의 행마다 Query 하나가 있고 K의 행마다 Key 하나가 있습니다. K를 전치해서 곱하면 각 Query와 각 Key를 비교한 표가 만들어집니다. Query가 n개, Key가 m개라면 결과 크기는 `[n, m]`입니다.

표의 `(i, j)` 칸은 i번째 위치가 j번째 위치를 참고할 때 쓰는 점수입니다. 이 해석을 기억하면 마스크를 어느 칸에 적용하는지도 이해할 수 있습니다.

## ‘유사하다’라는 비유의 한계

벡터 길이도 내적에 영향을 줍니다. 정규화한 벡터의 cosine similarity와 무조건 같은 연산이 아닙니다. 더구나 Q와 K는 서로 다른 학습 변환에서 나오므로, 사람이 생각하는 의미 유사도를 그대로 재는 고정된 자가 아닙니다.

## 확인합니다

Query 수가 3이고 Key 수가 5이면 점수표는 어떤 모양인지, 한 행이 무엇을 의미하는지 설명해 보십시오.

## 출처와 더 읽기

- [D2L · Linear Algebra](https://d2l.ai/chapter_preliminaries/linear-algebra.html)
- [D2L · Attention Scoring Functions](https://d2l.ai/chapter_attention-mechanisms-and-transformers/attention-scoring-functions.html)
