import SwiftUI

enum HandyCallTheme {
    static let emerald = Color(red: 0.05, green: 0.63, blue: 0.44)
    static let emeraldDark = Color(red: 0.02, green: 0.49, blue: 0.34)
    static let slate = Color(red: 0.09, green: 0.14, blue: 0.20)
    static let canvas = Color(red: 0.96, green: 0.98, blue: 0.97)

    static let topGradient = LinearGradient(
        colors: [emeraldDark, emerald],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
