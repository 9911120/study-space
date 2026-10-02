# Q·K·V — 역할별 벡터 만들기

현재 층의 입력 표현을 X라고 하겠습니다. 한 어텐션 헤드에서는 다른 가중치 행렬을 사용해 역할별 표현을 만듭니다.

```text
Q = XW_Q
K = XW_K
V = XW_V
```

이 식은 Self-Attention의 경우입니다. Cross-Attention에서는 Q를 만드는 입력과 K·V를 만드는 입력이 다를 수 있습니다.

## 세 개의 복사본을 만드는 것은 아닙니다

서로 다른 행렬을 곱하면 같은 X에서도 다른 특징 조합을 얻습니다. Q와 K는 참고 비중을 결정하는 비교에, V는 그 비중으로 실제 정보를 합치는 데 사용합니다. 모델이 쓰는 변환 행렬들은 학습을 통해 조정됩니다.

선형 변환은 여러 입력 숫자를 가중합해 새로운 숫자들로 바꾸는 연산입니다. ‘projection’이라는 이름만 보고 항상 차원을 줄이는 계산이라고 생각할 필요는 없습니다.

## 영구적인 것과 요청별로 생기는 것

`W_Q`, `W_K`, `W_V`는 모델 가중치입니다. 반면 Q, K, V는 현재 문장과 현재 층의 표현으로 계산한 **활성값**입니다. 입력이 달라지면 보통 달라집니다.

KV 캐시에 보관하는 것은 이 가중치 행렬 자체가 아니라, 이전 토큰에 대해 계산한 K와 V입니다. 지금 이 구분을 잡아두면 나중에 캐시가 왜 토큰 수에 따라 커지는지 이해하기 쉽습니다.

## 확인합니다

사용자 질문이 달라질 때, 일반적인 추론에서 W_Q와 Q 중 무엇이 달라지는지 설명해 보십시오.

## 출처와 더 읽기

- [PyTorch · MultiheadAttention](https://docs.pytorch.org/docs/stable/generated/torch.nn.MultiheadAttention.html)
- [Hugging Face · How caching works](https://huggingface.co/docs/transformers/cache_explanation)
