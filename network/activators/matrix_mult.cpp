#include <cmath>

// Matrices down contains element-wise implementation

double sigmoid(double z) {
    return 1.0 / (1.0 + exp(-z));
}

