# 03 · 어텐션을 숫자로 이해합니다

어텐션 수식은 여러 연산을 한 줄에 압축해 놓은 것입니다. 먼저 한 Query가 여러 위치에서 정보를 모으는 경우를 계산하고, 그 뒤 모든 Query를 행렬로 묶으면 됩니다.

```text
Attention(Q, K, V) = softmax(QKᵀ / √dₖ + M) V
```

## 기호를 먼저 읽습니다

| 기호 | 의미 |
| --- | --- |
| Q | 정보를 모으려는 위치의 Query들을 쌓은 행렬입니다. |
| K | 비교 대상 위치의 Key들을 쌓은 행렬입니다. |
| V | 실제로 가중합할 Value들을 쌓은 행렬입니다. |
| Kᵀ | K의 행과 열을 바꾼 전치입니다. |
| dₖ | Query와 Key 벡터의 길이입니다. |
| M | 참고할 수 없는 위치를 제외하는 마스크입니다. |

## 이 그룹의 공통 예제

설명을 위해 `q = [1, 0]`, `k₁ = [1, 0]`, `k₂ = [0, 1]`을 가정합니다. 참고할 정보는 `v₁ = [2, 0]`, `v₂ = [0, 4]`입니다. 실제 학습된 모델에서 가져온 값이 아닙니다.

이 숫자는 왼쪽 카드부터 차례로 사용합니다. 마지막에는 가중치 약 `[0.670, 0.330]`과 출력 약 `[1.340, 1.321]`을 얻게 됩니다. 이 출력은 토큰 ID가 아닌 새로운 정보 벡터입니다.

## 수식을 읽는 원칙

숫자의 의미를 억지로 사람의 언어와 일대일로 대응시키지 않습니다. Query를 ‘질문’, Key를 ‘색인’, Value를 ‘내용’으로 비유할 수 있지만, 실제 동작은 학습된 벡터와 행렬의 계산입니다. 의미를 이해할 때는 비유를, 구현을 이해할 때는 배열 모양을 사용합니다.

## 출처와 더 읽기

- [PyTorch · scaled_dot_product_attention](https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html)
- [D2L · Attention Scoring Functions](https://d2l.ai/chapter_attention-mechanisms-and-transformers/attention-scoring-functions.html)
