cmake_minimum_required(VERSION 4.2)
project(ld6001_parser)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(ld6001_parser main.cpp ld6001_parser.cpp)
target_include_directories(ld6001_parser PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

add_executable(ld6001_parser_tests tests/ld6001_parser_tests.cpp ld6001_parser.cpp)
target_include_directories(ld6001_parser_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

enable_testing()
add_test(NAME ld6001_parser_tests COMMAND ld6001_parser_tests)
