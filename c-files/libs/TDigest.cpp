//
// Created by cicerolp on 1/15/18.
//

#include "stdafx.h"
#include "TDigest.h"

// TODO pass std::array
// void PDigest::merge(pivot_it &it_lower, pivot_it &it_upper) {
//   std::vector<float> inMean, inWeight;

//   while (it_lower != it_upper) {
//     auto &payload = (*it_lower).get_payload();
//     uint32_t lastUsedCell = payload.size() / 2;

//     inMean.reserve(inMean.size() + lastUsedCell);
//     inWeight.reserve(inWeight.size() + lastUsedCell);

//     for (auto i = 0; i < lastUsedCell; ++i) {
//       inMean.emplace_back(payload[i]); // mean
//       inWeight.emplace_back(payload[i + lastUsedCell]); // weight
//     }

//     ++it_lower;
//   }

//   add(inMean, inWeight);
// }

// TODO pass std::array
void PDigest::merge(const PDigest &pivot) {
  std::vector<float> mean;
  std::vector<float> weight;

  uint32_t lastUsedCell = pivot._weight.size();

  mean.reserve(mean.size() + lastUsedCell);
  weight.reserve(weight.size() + lastUsedCell);

  for (auto i = 0; i < lastUsedCell; ++i) {
    mean.emplace_back(pivot._mean[i]); // mean
    weight.emplace_back(pivot._weight[i]); // weight
  }

  add(mean, weight);
}

float PDigest::quantile(float q) const {
  if (_lastUsedCell == 0 && _weight[_lastUsedCell] == 0) {
    // no centroids means no data, no way to get a quantile
    return std::numeric_limits<float>::quiet_NaN();

  } else if (_lastUsedCell == 0) {
    // with one data point, all quantiles lead to Rome
    return _mean[0];
  }

  // we know that there are at least two centroids now
  int32_t n = _lastUsedCell;

  float totalWeight = std::accumulate(_weight.begin(), _weight.begin() + _lastUsedCell, 0.0);

  // if values were stored in a sorted array, index would be the offset we are interested in
  const float index = q * totalWeight;

  // at the boundaries, we return min or max
  if (index < _weight[0] / 2) {
    return _min + 2 * index / _weight[0] * (_mean[0] - _min);
  }

  // in between we interpolate between centroids
  float weightSoFar = _weight[0] / 2;

  for (auto i = 0; i < n - 1; ++i) {
    float dw = (_weight[i] + _weight[i + 1]) / 2;

    if (weightSoFar + dw > index) {
      // centroids i and i+1 bracket our current point
      float z1 = index - weightSoFar;
      float z2 = weightSoFar + dw - index;
      return weightedAverage(_mean[i], z2, _mean[i + 1], z1);
    }

    weightSoFar += dw;
  }

  // weightSoFar = totalWeight - weight[n-1]/2 (very nearly)
  // so we interpolate out to max value ever seen
  float z1 = index - totalWeight - _weight[n - 1] / 2.0;
  float z2 = _weight[n - 1] / 2 - z1;

  return weightedAverage(_mean[n - 1], z1, _max, z2);
}

float PDigest::inverse_quantile(float value) const {
  if (_lastUsedCell == 0 && _weight[_lastUsedCell] == 0) {
    // no centroids means no data, no way to get a quantile
    return std::numeric_limits<float>::quiet_NaN();
  }

  auto it = std::lower_bound(_mean.begin(), _mean.begin() + _lastUsedCell, value);

  // it == end of data
  if (it == (_mean.begin() + _lastUsedCell)) {
    return 1.0f;
  }

  // it == begin of data
  if (it == _mean.begin()) {
    return 0.f;
  }

  auto index = it - _mean.begin();

  // in between we interpolate between centroids
  float weightSoFar = _weight[0] / 2;

  for (auto i = 0; i < index - 1; ++i) {
    weightSoFar += (_weight[i] + _weight[i + 1]) / 2;
  }

  float dw = (_weight[index - 1] + _weight[index]) / 2;

  // dw * q + weightSoFar
  weightSoFar += dw * (value - _mean[index - 1]) / (_mean[index] - _mean[index - 1]);

  auto totalWeight = std::accumulate(_weight.begin(), _weight.begin() + _lastUsedCell, 0.0);

  return weightSoFar / totalWeight;
}

// stde::dynarray<float> *PDigest::get_payload(uint32_t first, uint32_t second) {
//   // TODO get value from dataset
//   std::vector<float> inMean;
//   inMean.reserve(second - first);

//   for (auto p = first; p < second; ++p) {
//     inMean.emplace_back(rand() % 1001);
//   }
//   // every weight equal 1
//   std::vector<float> inWeight(second - first, 1);

//   //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//   // temporary data
//   uint32_t lastUsedCell{0};

//   // mean of points added to each merged centroid
//   std::array<float, PDIGEST_ARRAY_SIZE> mean;

//   // number of points that have been added to each merged centroid
//   std::array<float, PDIGEST_ARRAY_SIZE> weight;

//   int32_t incomingCount = inMean.size();

//   auto inOrder = sort_indexes(inMean);

//   float totalWeight = std::accumulate(inWeight.begin(), inWeight.end(), 0.0);

//   float normalizer = PDIGEST_COMPRESSION / (M_PI * totalWeight);

//   lastUsedCell = 0;
//   mean[lastUsedCell] = inMean[inOrder[0]];
//   weight[lastUsedCell] = inWeight[inOrder[0]];

//   float wSoFar = 0;

//   float k1 = 0;

//   // weight will contain all zeros
//   float wLimit;
//   wLimit = totalWeight * integratedQ(k1 + 1);

//   for (int i = 1; i < incomingCount; ++i) {
//     int ix = inOrder[i];
//     float proposedWeight = weight[lastUsedCell] + inWeight[ix];

//     float projectedW = wSoFar + proposedWeight;

//     bool addThis = false;

// #ifdef PDIGEST_WEIGHT_LIMIT
//     float z = proposedWeight * normalizer;
//     float q0 = wSoFar / totalWeight;
//     float q2 = (wSoFar + proposedWeight) / totalWeight;
//     addThis = z * z <= q0 * (1 - q0) && z * z <= q2 * (1 - q2);
// #else
//     addThis = projectedW <= wLimit;
// #endif

//     if (addThis) {
//       // next point will fit
//       // so merge into existing centroid
//       weight[lastUsedCell] += inWeight[ix];
//       mean[lastUsedCell] = mean[lastUsedCell]
//           + (inMean[ix] - mean[lastUsedCell]) * inWeight[ix] / weight[lastUsedCell];

//       inWeight[ix] = 0;

//     } else {
//       // didn't fit ... move to next output, copy out first centroid
//       wSoFar += weight[lastUsedCell];

// #ifndef PDIGEST_WEIGHT_LIMIT
//       k1 = integratedLocation(wSoFar / totalWeight);
//       wLimit = totalWeight * integratedQ(k1 + 1);
// #endif

//       lastUsedCell++;
//       mean[lastUsedCell] = inMean[ix];
//       weight[lastUsedCell] = inWeight[ix];
//       inWeight[ix] = 0;
//     }
//   }

//   // points to next empty cell
//   lastUsedCell++;

//   // shrink_to_fit
//   stde::dynarray<float> *payload = new stde::dynarray<float>(lastUsedCell * 2 + 1);

//   std::memcpy(&(*payload)[0], &mean[0], lastUsedCell * sizeof(float));
//   std::memcpy(&(*payload)[lastUsedCell], &weight[0], lastUsedCell * sizeof(float));

//   return payload;
// }

void PDigest::add(std::vector<float> inMean, std::vector<float> inWeight) {
  inMean.insert(inMean.end(), _mean.begin(), _mean.begin() + _lastUsedCell);
  inWeight.insert(inWeight.end(), _weight.begin(), _weight.begin() + _lastUsedCell);

  int32_t incomingCount = inMean.size();

  auto inOrder = sort_indexes(inMean);

  float totalWeight = std::accumulate(inWeight.begin(), inWeight.end(), 0.0);

  float normalizer = PDIGEST_COMPRESSION / (M_PI * totalWeight);

  _lastUsedCell = 0;
  _mean[_lastUsedCell] = inMean[inOrder[0]];
  _weight[_lastUsedCell] = inWeight[inOrder[0]];

  float wSoFar = 0;

  float k1 = 0;

  // weight will contain all zeros
  float wLimit;
  wLimit = totalWeight * integratedQ(k1 + 1);

  for (int i = 1; i < incomingCount; ++i) {
    int ix = inOrder[i];
    float proposedWeight = _weight[_lastUsedCell] + inWeight[ix];

    float projectedW = wSoFar + proposedWeight;

    bool addThis = false;

#ifdef PDIGEST_WEIGHT_LIMIT
    float z = proposedWeight * normalizer;
    float q0 = wSoFar / totalWeight;
    float q2 = (wSoFar + proposedWeight) / totalWeight;
    addThis = z * z <= q0 * (1 - q0) && z * z <= q2 * (1 - q2);
#else
    addThis = projectedW <= wLimit;
#endif

    if (addThis) {
      // next point will fit
      // so merge into existing centroid
      _weight[_lastUsedCell] += inWeight[ix];
      _mean[_lastUsedCell] = _mean[_lastUsedCell]
          + (inMean[ix] - _mean[_lastUsedCell]) * inWeight[ix] / _weight[_lastUsedCell];

      inWeight[ix] = 0;

    } else {
      // didn't fit ... move to next output, copy out first centroid
      wSoFar += _weight[_lastUsedCell];

#ifndef PDIGEST_WEIGHT_LIMIT
      k1 = integratedLocation(wSoFar / totalWeight);
      wLimit = totalWeight * integratedQ(k1 + 1);
#endif

      _lastUsedCell++;
      _mean[_lastUsedCell] = inMean[ix];
      _weight[_lastUsedCell] = inWeight[ix];
      inWeight[ix] = 0;
    }
  }
  // points to next empty cell
  _lastUsedCell++;

  if (totalWeight > 0) {
    _min = std::min(_min, _mean[0]);
    _max = std::max(_max, _mean[_lastUsedCell - 1]);
  }
}

float PDigest::asinApproximation(float x) {

#ifdef PDIGEST_PIECE_WISE_APPROXIMATION
  if (x < 0) {
    return -asinApproximation(-x);
  } else {
    // this approximation works by breaking that range from 0 to 1 into 5 regions
    // for all but the region nearest 1, rational polynomial models get us a very
    // good approximation of asin and by interpolating as we move from region to
    // region, we can guarantee continuity and we happen to get monotonicity as well.
    // for the values near 1, we just use Math.asin as our region "approximation".

    // cutoffs for models. Note that the ranges overlap. In the overlap we do
    // linear interpolation to guarantee the overall result is "nice"
    float c0High = 0.1;
    float c1High = 0.55;
    float c2Low = 0.5;
    float c2High = 0.8;
    float c3Low = 0.75;
    float c3High = 0.9;
    float c4Low = 0.87;
    if (x > c3High) {
      return std::asin(x);
    } else {
      // the models
      float m0[] = {0.2955302411, 1.2221903614, 0.1488583743, 0.2422015816, -0.3688700895, 0.0733398445};
      float m1[] = {-0.0430991920, 0.9594035750, -0.0362312299, 0.1204623351, 0.0457029620, -0.0026025285};
      float
          m2[] = {-0.034873933724, 1.054796752703, -0.194127063385, 0.283963735636, 0.023800124916, -0.000872727381};
      float m3[] = {-0.37588391875, 2.61991859025, -2.48835406886, 1.48605387425, 0.00857627492, -0.00015802871};

      // the parameters for all of the models
      float vars[] = {1, x, x * x, x * x * x, 1 / (1 - x), 1 / (1 - x) / (1 - x)};

      // raw grist for interpolation coefficients
      float x0 = bound((c0High - x) / c0High);
      float x1 = bound((c1High - x) / (c1High - c2Low));
      float x2 = bound((c2High - x) / (c2High - c3Low));
      float x3 = bound((c3High - x) / (c3High - c4Low));

      // interpolation coefficients
      //noinspection UnnecessaryLocalVariable
      float mix0 = x0;
      float mix1 = (1 - x0) * x1;
      float mix2 = (1 - x1) * x2;
      float mix3 = (1 - x2) * x3;
      float mix4 = 1 - x3;

      // now mix all the results together, avoiding extra evaluations
      float r = 0;
      if (mix0 > 0) {
        r += mix0 * eval(m0, vars);
      }
      if (mix1 > 0) {
        r += mix1 * eval(m1, vars);
      }
      if (mix2 > 0) {
        r += mix2 * eval(m2, vars);
      }
      if (mix3 > 0) {
        r += mix3 * eval(m3, vars);
      }
      if (mix4 > 0) {
        // model 4 is just the real deal
        r += mix4 * std::asin(x);
      }
      return r;
    }
  }
#else
  return std::asin(x);
#endif
}
