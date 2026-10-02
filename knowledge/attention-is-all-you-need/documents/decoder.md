# 디코더 — 두 문맥으로 쓰기

디코더는 원문만 받아 답변 전체를 단번에 만드는 함수가 아닙니다. **출력 앞부분과 인코더의 표현**을 조건으로 다음 출력 토큰을 예측하는 표현을 만듭니다.

## 서로 다른 두 어텐션

1. **Masked Self-Attention**은 디코더 쪽 토큰들 사이에서 정보를 모읍니다. 각 위치는 미래 출력 위치를 보지 못합니다.
2. **Cross-Attention**은 인코더가 만든 원문 표현을 참고합니다. Query는 디코더 쪽에서, Key와 Value는 인코더 쪽에서 만듭니다.

그 뒤 FFN과 잔차·정규화 등의 계산이 이어집니다. Cross-Attention에서 Q의 길이는 출력 위치 수, K와 V의 길이는 입력 위치 수이므로 두 길이가 같을 필요는 없습니다.

## 왜 두 문맥이 필요한가요?

번역에서는 원문이 무엇을 말하는지와 번역문을 어디까지 썼는지가 모두 중요합니다. 같은 원문이라도 이미 출력한 앞부분이 달라지면 이어질 후보도 달라집니다.

시작 시에는 시작 기호 같은 디코더 입력이 필요합니다. 그 후 선택한 출력 토큰을 이어 붙이면서 반복합니다. 학습 때 정답 앞부분을 제공하는 방법은 04 그룹에서 설명합니다.

## 오늘의 GPT와 구분합니다

일반적인 GPT 계열의 디코더 전용 모델에는 이 원문용 인코더와 encoder–decoder cross-attention이 그대로 있는 것이 아닙니다. 원문 구조를 이해한 뒤 어떤 블록이 남고 어떤 블록이 빠지는지 비교해야 합니다.

## 확인합니다

Self-Attention과 Cross-Attention 각각에서 Q, K, V가 어디서 오는지 설명해 보십시오.

## 출처와 더 읽기

- [PyTorch · TransformerDecoderLayer](https://docs.pytorch.org/docs/stable/generated/torch.nn.TransformerDecoderLayer.html)
- [Harvard NLP · The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/)
