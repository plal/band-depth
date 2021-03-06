// stdafx.h : include file for standard system include files,
// or project specific include files that are used frequently, but
// are changed infrequently

#pragma once

#define RAPIDJSON_SSE2
#define RAPIDJSON_HAS_STDSTRING 1

// Windows specific defines
#define NOMINMAX
#define WIN32_LEAN_AND_MEAN
#define _USE_MATH_DEFINES
#define _CRT_SECURE_NO_WARNINGS

// CMake Config File

#ifdef ENABLE_GPERF
#include <gperftools/profiler.h>
#endif

// C includes
#include <cassert>
#include <cmath>
#include <cstdint>
#include <cstdio>

// C++ includes
#include <algorithm>
#include <array>
#include <fstream>
#include <iostream>
#include <random>
#include <regex>
#include <string>
#include <thread>
#include <tuple>
#include <unordered_map>
#include <vector>
#include <numeric>

// boost library
#include <boost/lexical_cast.hpp>
#include <boost/algorithm/string.hpp>
#include <boost/tokenizer.hpp>
// #include <boost/program_options.hpp>
#include <boost/property_tree/ptree.hpp>
#include <boost/property_tree/xml_parser.hpp>



// dynarray
#include "dynarray.hpp"



template<class T>
auto operator<<(std::ostream &os, const T &t) -> decltype(t.print(os), os) {
  t.print(os);
  return os;
}
