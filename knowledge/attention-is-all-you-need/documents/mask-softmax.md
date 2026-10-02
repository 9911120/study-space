# 마스크와 softmax — 비중 정하기

내적 점수에 스케일을 적용한 뒤, 참고할 수 없는 칸을 제외합니다. 그 후 softmax를 **Key 방향, 즉 각 Query의 행 안에서** 계산합니다.

## 마스크의 두 가지 이유

- **인과적 마스크**는 미래 출력 위치를 참고하지 못하게 합니다. 학습 중 정답을 미리 엿보는 것을 막습니다.
- **패딩 마스크**는 길이를 맞추기 위해 채운 위치를 참고하지 않게 합니다.

개념적으로 제외할 점수에 `-∞`를 더하면 softmax 이후 가중치가 0이 됩니다. 실제 라이브러리에서 불리언 마스크의 True 의미는 API마다 다를 수 있으므로 확인해야 합니다.

## 공통 예제의 가중치

두 점수 `[1, 0]`를 √2로 나누면 약 `[0.707, 0]`입니다. Softmax는 각 점수의 지수값을 전체 지수값의 합으로 나눕니다.

```text
가중치₁ = exp(0.707) / (exp(0.707) + exp(0)) ≈ 0.670
가중치₂ = exp(0)     / (exp(0.707) + exp(0)) ≈ 0.330
```

두 번째 위치가 마스크로 제외되었다면 결과는 `[1, 0]`입니다. 계산할 수 있는 위치가 하나도 없는 행은 수학적으로 문제가 되므로, 구현에서는 마스크 구성을 잘못 만들지 않아야 합니다.

## 확인합니다

패딩 위치와 미래 위치가 모두 가려질 수 있지만, 두 마스크의 목적은 어떻게 다른지 설명해 보십시오.

## 출처와 더 읽기

- [PyTorch · scaled_dot_product_attention의 마스크](https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html)
- [PyTorch · Softmax](https://docs.pytorch.org/docs/stable/generated/torch.nn.Softmax.html)
