# Self-Attention

Self-Attention은 같은 시퀀스 안에서 토큰 사이의 관계를 계산합니다.

## 세 가지 역할

| 이름 | 직관적인 역할 |
| --- | --- |
| Query | 현재 위치에서 찾고 싶은 정보입니다. |
| Key | 각 위치가 어떤 정보와 맞는지 비교할 표현입니다. |
| Value | 가중치를 적용해 모을 정보입니다. |

```text
Attention(Q, K, V) = softmax(QKᵀ / √dₖ)V
```

Q와 K를 비교한 점수를 확률 형태의 가중치로 바꾸고 V를 가중합합니다. 생성형 모델에서는 미래 토큰을 미리 보지 못하도록 마스크를 사용합니다.

> 이 설명은 역할을 이해하기 위한 직관입니다. Q, K, V는 사람이 붙인 의미표가 아니라 학습한 선형 변환으로 얻는 벡터입니다.

## 다음 질문

‘왜 √dₖ로 나눌까요?’를 새 질문으로 연결해 봅니다.

## 참고 자료

[Attention Is All You Need · Scaled Dot-Product Attention](https://arxiv.org/abs/1706.03762)
