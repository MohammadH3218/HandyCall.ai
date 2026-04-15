import SwiftUI

enum HandyCallTheme {
    // MARK: - Brand Colors (fixed, not adaptive)
    static let emeraldFixed = Color(red: 0.02, green: 0.59, blue: 0.41)       // #059669
    static let emeraldDarkFixed = Color(red: 0.02, green: 0.49, blue: 0.34)   // #047857

    // MARK: - Adaptive Core Colors (brighter in dark mode for contrast)
    static var emerald: Color {
        Color(light: Color(red: 0.02, green: 0.59, blue: 0.41),
              dark: Color(red: 0.20, green: 0.78, blue: 0.60))
    }

    static var emeraldDark: Color {
        Color(light: Color(red: 0.02, green: 0.49, blue: 0.34),
              dark: Color(red: 0.05, green: 0.63, blue: 0.44))
    }

    // MARK: - Surface Colors (adaptive)
    static var canvas: Color {
        Color(light: Color(red: 0.96, green: 0.98, blue: 0.97),
              dark: Color(red: 0.07, green: 0.07, blue: 0.07))
    }

    static var pageBackground: Color {
        Color(light: Color(red: 0.95, green: 0.98, blue: 0.96),
              dark: Color(red: 0.0, green: 0.0, blue: 0.0))
    }

    static var surfaceWhite: Color {
        Color(light: .white,
              dark: Color(red: 0.11, green: 0.11, blue: 0.12))
    }

    static var surfaceGray: Color {
        Color(light: Color(red: 0.95, green: 0.95, blue: 0.95),
              dark: Color(red: 0.17, green: 0.17, blue: 0.18))
    }

    static var surfaceElevated: Color {
        Color(light: .white,
              dark: Color(red: 0.14, green: 0.14, blue: 0.15))
    }

    // MARK: - Text Colors (adaptive)
    static var slate: Color {
        Color(light: Color(red: 0.09, green: 0.14, blue: 0.20),
              dark: Color(red: 0.93, green: 0.93, blue: 0.94))
    }

    static let textPrimary = slate
    static let textSecondary = Color.secondary

    // MARK: - Accent Surfaces (adaptive)
    static var emeraldLight: Color {
        Color(light: Color(red: 0.85, green: 0.95, blue: 0.90),
              dark: Color(red: 0.02, green: 0.20, blue: 0.14))
    }

    static var emeraldMist: Color {
        Color(light: Color(red: 0.92, green: 0.97, blue: 0.94),
              dark: Color(red: 0.04, green: 0.16, blue: 0.11))
    }

    static var callerBubble: Color {
        Color(light: Color(red: 0.93, green: 0.95, blue: 0.98),
              dark: Color(red: 0.15, green: 0.17, blue: 0.21))
    }

    // MARK: - Status Colors
    static let destructive = Color(red: 0.90, green: 0.25, blue: 0.20)
    static let warning = Color(red: 0.95, green: 0.68, blue: 0.14)
    static let info = Color(red: 0.20, green: 0.50, blue: 0.90)

    // MARK: - Gradients
    static let topGradient = LinearGradient(
        colors: [emeraldDarkFixed, emeraldFixed],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let heroGradient = LinearGradient(
        colors: [emeraldDarkFixed, emeraldFixed, emeraldFixed.opacity(0.9)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static var cardGradient: LinearGradient {
        LinearGradient(
            colors: [emeraldFixed.opacity(0.08), emeraldDarkFixed.opacity(0.03)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Status Color Mapping
    static func statusColor(for status: String?) -> Color {
        switch status?.lowercased().replacingOccurrences(of: "_", with: " ") {
        case "completed", "confirmed", "qualified", "paid":
            return emeraldFixed
        case "in progress", "active", "new":
            return info
        case "scheduled", "pending", "contacted", "sent", "viewed":
            return warning
        case "cancelled", "missed", "lost", "overdue":
            return destructive
        default:
            return .secondary
        }
    }

    // MARK: - Typography
    enum Typography {
        static let largeTitle = Font.largeTitle.weight(.bold)
        static let title = Font.title2.weight(.bold)
        static let title3 = Font.title3.weight(.bold)
        static let headline = Font.headline.weight(.semibold)
        static let subhead = Font.subheadline.weight(.medium)
        static let body = Font.body
        static let callout = Font.callout.weight(.semibold)
        static let footnote = Font.footnote
        static let footnoteSemibold = Font.footnote.weight(.semibold)
        static let caption = Font.caption
        static let caption2 = Font.caption2.weight(.semibold)
        static let statNumber = Font.system(size: 28, weight: .bold, design: .rounded)
    }

    // MARK: - Spacing
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let xxl: CGFloat = 24
        static let xxxl: CGFloat = 32
        static let cardPadding: CGFloat = 16
        static let screenPadding: CGFloat = 16
    }

    // MARK: - Corner Radius
    enum Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
        static let card: CGFloat = 16
        static let button: CGFloat = 14
    }
}

// MARK: - Adaptive Color Helper

extension Color {
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(dark)
                : UIColor(light)
        })
    }
}

// MARK: - Shadow Modifiers

struct CardShadow: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content.shadow(
            color: colorScheme == .dark
                ? .black.opacity(0.3)
                : .black.opacity(0.06),
            radius: colorScheme == .dark ? 4 : 8,
            x: 0,
            y: colorScheme == .dark ? 1 : 3
        )
    }
}

struct ElevatedShadow: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content.shadow(
            color: colorScheme == .dark
                ? .black.opacity(0.4)
                : .black.opacity(0.12),
            radius: colorScheme == .dark ? 6 : 16,
            x: 0,
            y: colorScheme == .dark ? 2 : 6
        )
    }
}

struct SubtleShadow: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content.shadow(
            color: colorScheme == .dark
                ? .black.opacity(0.2)
                : .black.opacity(0.04),
            radius: colorScheme == .dark ? 2 : 4,
            x: 0,
            y: colorScheme == .dark ? 1 : 2
        )
    }
}

extension View {
    func cardShadow() -> some View { modifier(CardShadow()) }
    func elevatedShadow() -> some View { modifier(ElevatedShadow()) }
    func subtleShadow() -> some View { modifier(SubtleShadow()) }
}
