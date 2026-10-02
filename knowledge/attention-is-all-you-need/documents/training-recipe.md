# 학습 설정도 결과의 일부입니다

학습률은 가중치를 갱신할 때의 이동 규모에 영향을 줍니다. 너무 크거나 작은 값을 부적절하게 쓰면 학습이 불안정하거나 비효율적일 수 있습니다. 논문을 읽을 때 모델 그림과 학습 설정을 분리해서 기록해야 합니다.

## 원문에서 확인할 설정

원문은 Adam과 학습률 warmup을 사용했습니다. 첫 4,000스텝 동안 학습률을 높인 뒤 감소시키는 일정을 제시합니다. 기본 모델의 dropout 비율과 label smoothing 값은 각각 0.1입니다. 이는 2017년 실험의 조건이며 새로운 모델에 그대로 최적이라고 볼 수 없습니다.

## 각 장치가 다루는 문제

- **Warmup**은 학습 초기에 갱신 규모를 점진적으로 늘리는 일정입니다.
- **Dropout**은 학습 중 일부 활성값을 확률적으로 제외하고 규모를 조정하는 정규화 방법입니다. 평가 모드에서는 보통 비활성화합니다.
- **Label smoothing**은 정답 분포를 완전히 한 후보에만 집중시키지 않도록 바꿉니다. 출력 토큰을 무작위로 틀리게 고르는 옵션과 다릅니다.

## 재현과 응용을 구분합니다

논문을 재현한다면 데이터 전처리, 스케줄, 평가 방법까지 맞춰야 합니다. 다른 문제에 응용한다면 각 설정이 어떤 문제를 다루는지 이해하고 실험으로 선택해야 합니다. 숫자만 복사하는 것은 두 목적 모두에 충분하지 않습니다.

## 확인합니다

학습 시 dropout과 생성 시 sampling이 각각 어디에서 무엇을 바꾸는지 구분해 보십시오.

## 출처와 더 읽기

- [Vaswani 외 · Attention Is All You Need (2017)](https://arxiv.org/html/1706.03762v7)
- [PyTorch · Dropout](https://docs.pytorch.org/docs/stable/generated/torch.nn.Dropout.html)
- [PyTorch · CrossEntropyLoss의 label_smoothing](https://docs.pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html)
