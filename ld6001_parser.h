#ifndef LD2450_PARSER_H
#define LD2450_PARSER_H

#include <vector>

#include "bak/include/baudvine/ringbuf.h"

namespace hilink {
    constexpr uint8_t RX_DATA_PREAMBLE[] = {0xaa, 0xff, 0x03, 0x00};
    constexpr uint8_t RX_DATA_POSTAMBLE[] = {0x55, 0xcc};
    constexpr size_t FRAME_PAYLOAD_SIZE = 24;
    constexpr size_t FRAME_SIZE = sizeof(RX_DATA_PREAMBLE) + sizeof(RX_DATA_POSTAMBLE) + FRAME_PAYLOAD_SIZE;
    constexpr size_t MAX_TARGETS = 3;;

    static constexpr size_t MAX_BUF_SIZE = FRAME_SIZE * 10;

    class Ld6001Parser {
    public:
        enum class SensorTarget {
            TARGET_1 = 1,
            TARGET_2 = 2,
            TARGET_3 = 3,
            TARGET_4 = 4,
            TARGET_5 = 5,
            TARGET_6 = 6,
            TARGET_7 = 7,
            TARGET_8 = 8,
            TARGET_9 = 9,
            TARGET_10 = 10,
        };

        struct SensorData {
            SensorTarget targetId;
            int16_t x;
            int16_t y;
            int16_t speed;
            uint32_t distanceInCm;
            uint16_t resolution;
            bool valid = false;
        };

        Ld6001Parser();

        // Pushes new data into the internal buffer and parses it.
        // Returns a vector of all targets found in the new data.
        std::vector<SensorData> parse(const uint8_t *data, size_t len);

    private:
        struct DataPosition {
            const uint8_t *start;
            const uint8_t *end;
        };

        void removeFrameFromBuffer();

        baudvine::RingBuf<uint8_t, MAX_BUF_SIZE> m_buffer;
    };
} // namespace hilink

#endif // LD2450_PARSER_H
