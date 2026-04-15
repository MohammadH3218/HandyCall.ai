import SwiftUI

enum AppearanceMode: String, CaseIterable {
    case system = "System"
    case light = "Light"
    case dark = "Dark"

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }

    var icon: String {
        switch self {
        case .system: return "circle.lefthalf.filled"
        case .light: return "sun.max.fill"
        case .dark: return "moon.fill"
        }
    }
}

@MainActor
final class AppearanceManager: ObservableObject {
    private static let storageKey = "handycall.appearance_mode"

    @Published var mode: AppearanceMode {
        didSet {
            UserDefaults.standard.set(mode.rawValue, forKey: Self.storageKey)
            applyToWindow()
        }
    }

    init() {
        let saved = UserDefaults.standard.string(forKey: Self.storageKey) ?? ""
        self.mode = AppearanceMode(rawValue: saved) ?? .system
    }

    var colorScheme: ColorScheme? {
        mode.colorScheme
    }

    func applyToWindow() {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first else { return }

        UIView.animate(withDuration: 0.3) {
            switch self.mode {
            case .system:
                window.overrideUserInterfaceStyle = .unspecified
            case .light:
                window.overrideUserInterfaceStyle = .light
            case .dark:
                window.overrideUserInterfaceStyle = .dark
            }
        }
    }
}
