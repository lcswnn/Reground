import SwiftUI
import WidgetKit

// MARK: - Data

/// The public humanity artifact, built daily by `data-layer/` and served from a
/// public Supabase Storage bucket.
///
/// Hardcoded rather than injected. It is the same URL already compiled into the
/// JS bundle and extractable from the IPA, so it is not a secret, and threading a
/// build setting through to an app extension to hide a public URL would buy
/// nothing.
private let artifactURL = URL(
  string: "https://caateojxwnyaxqaywrdn.supabase.co/storage/v1/object/public/artifacts/humanity.json"
)!

/// Only the fields the widget draws.
///
/// `Decodable` over a subset of the payload on purpose: the artifact carries
/// series, anchors, weights and provenance for sixteen indicators, and decoding
/// all of it in a memory-limited extension to render two numbers would be waste.
/// Unknown keys are ignored by `JSONDecoder`, so the data layer can keep adding
/// fields without touching this file.
/// Internal rather than `private` because `Entry` is internal and exposes a
/// `Metric` — Swift refuses a declaration whose type is less visible than it is.
struct Artifact: Decodable {
  let compositeScore: Double
  let metrics: [Metric]

  struct Metric: Decodable {
    let id: String
    let label: String
    let currentValue: Double
    let unit: String
    /// Precomputed by `build-artifact.ts` from the real series — e.g.
    /// "↓ 5.6 pts since 1990". The widget never derives its own.
    let delta: String
    let normalized: Double
  }
}

struct Entry: TimelineEntry {
  let date: Date
  let score: Double
  let metric: Artifact.Metric?
  /// True when the fetch failed and this is the placeholder rather than data.
  let isPlaceholder: Bool

  static let placeholder = Entry(
    date: Date(),
    score: 0.36,
    metric: Artifact.Metric(
      id: "child-mortality",
      label: "Child mortality before 5",
      currentValue: 3.62,
      unit: "%",
      delta: "↓ 5.6 pts since 1990",
      normalized: 0.836
    ),
    isPlaceholder: true
  )
}

// MARK: - Formatting

/// Mirrors `formatMetricValue` in `src/api/humanity.ts`.
///
/// Duplicated rather than shared because Swift cannot import the app's
/// TypeScript. Kept to the same rounding rules so a number never disagrees
/// between the widget and the screen it links to; if that file's cases change,
/// this switch has to change with it.
private func formatValue(_ value: Double, unit: String) -> String {
  let magnitude = abs(value)
  let rounded: String
  if magnitude >= 100 {
    rounded = String(format: "%.0f", value)
  } else if magnitude >= 10 {
    rounded = String(format: "%.1f", value)
  } else {
    rounded = String(format: "%.2f", value)
  }

  switch unit {
  case "%": return "\(rounded)%"
  case "years": return "\(rounded) yrs"
  case "t": return "\(rounded) t"
  case "ppm": return "\(rounded) ppm"
  case "$/W": return "$\(rounded)/W"
  default: return "\(rounded) \(unit)"
  }
}

/// The indicator to show today.
///
/// Mirrors the metric half of `selectDailyCard` in `src/lib/daily-card.ts`: sort
/// by id so artifact order cannot shift the rotation, then index by days since
/// the epoch. The app additionally picks a *framing* and will fall through to
/// the next metric when no framing fits that indicator's series, so on those
/// occasional days the widget and the card name different indicators. Both are
/// individually correct, and reproducing the whole angle engine in Swift to
/// close that gap would be a second implementation to keep in step forever.
private func metricOfDay(_ metrics: [Artifact.Metric], on date: Date) -> Artifact.Metric? {
  guard !metrics.isEmpty else { return nil }
  let sorted = metrics.sorted { $0.id < $1.id }
  let day = Int(floor(date.timeIntervalSince1970 / 86_400))
  let index = ((day % sorted.count) + sorted.count) % sorted.count
  return sorted[index]
}

// MARK: - Timeline

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry { .placeholder }

  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    // The gallery preview must not depend on the network — a spinner or an
    // error is a bad first impression of a widget somebody is deciding to add.
    if context.isPreview {
      completion(.placeholder)
      return
    }
    Task { completion(await fetchEntry()) }
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    Task {
      let entry = await fetchEntry()

      // Six hours. The artifact rebuilds once a day, so this is already four
      // times more often than the data can change — the extra attempts exist to
      // recover from a failed fetch, not to chase freshness. iOS throttles this
      // anyway; see the scheduling note in docs/widget.md.
      let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date()
      completion(Timeline(entries: [entry], policy: .after(next)))
    }
  }

  private func fetchEntry() async -> Entry {
    do {
      var request = URLRequest(url: artifactURL)
      // The bucket answers `no-cache`, but an extension that hangs on a bad
      // network is worse than one showing yesterday's number.
      request.timeoutInterval = 15
      let (data, _) = try await URLSession.shared.data(for: request)
      let artifact = try JSONDecoder().decode(Artifact.self, from: data)

      return Entry(
        date: Date(),
        score: artifact.compositeScore,
        metric: metricOfDay(artifact.metrics, on: Date()),
        isPlaceholder: false
      )
    } catch {
      // Offline, or a half-written file. Showing the placeholder's shape with no
      // claim attached beats an error state on a home screen.
      return Entry(date: Date(), score: 0, metric: nil, isPlaceholder: true)
    }
  }
}

// MARK: - Palette

/// The app's tokens, as the extension sees them.
///
/// `src/constants/theme.ts` is the source of truth; these are the handful of
/// values this view needs. Each resolves per colour scheme so the widget follows
/// the home screen's appearance rather than the app's own light/dark override —
/// on a home screen, matching the wallpaper's scheme is what looks native.
private enum Palette {
  static let text = dynamic(light: "242120", dark: "CFD6D6")
  static let textMuted = dynamic(light: "6E5F5F", dark: "6F9997")
  /// The readable tan, not `brand` itself. In light mode `brand` is a fill —
  /// 1.7:1 on the sand background — so a widget label wearing it would be
  /// legible in dark mode and invisible in light. See the note in the theme.
  static let brandStrong = dynamic(light: "8E5A34", dark: "86B9B1")
  static let accentStrong = dynamic(light: "7A5C5C", dark: "A9B8D0")
  static let accentSoft = dynamic(light: "F0E2DE", dark: "16283A")
  static let background = dynamic(light: "FDDDB9", dark: "041520")

  private static func dynamic(light: String, dark: String) -> Color {
    Color(UIColor { traits in
      traits.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light)
    })
  }
}

private extension UIColor {
  convenience init(hex: String) {
    var value: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&value)
    self.init(
      red: CGFloat((value & 0xFF0000) >> 16) / 255,
      green: CGFloat((value & 0x00FF00) >> 8) / 255,
      blue: CGFloat(value & 0x0000FF) / 255,
      alpha: 1
    )
  }
}

// MARK: - Views

/// The progress bar, matching `HumanityProgress`'s proportions.
private struct ScoreBar: View {
  let score: Double

  var body: some View {
    GeometryReader { geometry in
      ZStack(alignment: .leading) {
        Capsule().fill(Palette.accentSoft)
        Capsule()
          .fill(Palette.accentStrong)
          .frame(width: max(0, min(1, score)) * geometry.size.width)
      }
    }
    .frame(height: 8)
  }
}

private struct SmallView: View {
  let entry: Entry

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("HUMANITY PROGRESS")
        .font(.system(size: 10, weight: .semibold))
        .kerning(0.8)
        .foregroundStyle(Palette.textMuted)
        .lineLimit(1)

      Text(entry.isPlaceholder ? "—" : "\(Int((entry.score * 100).rounded()))%")
        // Serif to match Libertinus on the home screen. The real face is not
        // bundled into the extension — one more copy of a font file in every
        // build, to be seen at 34pt behind a wallpaper — so the system serif
        // stands in for it.
        .font(.system(size: 34, weight: .bold, design: .rounded))
        .foregroundStyle(Palette.accentStrong)
        .minimumScaleFactor(0.6)
        .lineLimit(1)

      ScoreBar(score: entry.isPlaceholder ? 0 : entry.score)

      Spacer(minLength: 0)

      if let metric = entry.metric {
        Text(metric.label)
          .font(.system(size: 11, design: .rounded))
          .foregroundStyle(Palette.text)
          .lineLimit(2)
      }
    }
  }
}

private struct MediumView: View {
  let entry: Entry

  var body: some View {
    HStack(alignment: .top, spacing: 16) {
      VStack(alignment: .leading, spacing: 6) {
        Text("HUMANITY PROGRESS")
          .font(.system(size: 10, weight: .semibold))
          .kerning(0.8)
          .foregroundStyle(Palette.textMuted)
          .lineLimit(1)

        Text(entry.isPlaceholder ? "—" : "\(Int((entry.score * 100).rounded()))%")
          .font(.system(size: 38, weight: .bold, design: .rounded))
          .foregroundStyle(Palette.accentStrong)
          .minimumScaleFactor(0.6)
          .lineLimit(1)

        ScoreBar(score: entry.isPlaceholder ? 0 : entry.score)
        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      if let metric = entry.metric {
        VStack(alignment: .leading, spacing: 4) {
          Text("TODAY")
            .font(.system(size: 10, weight: .semibold))
            .kerning(0.8)
            .foregroundStyle(Palette.textMuted)

          Text(metric.label)
            .font(.system(size: 13, design: .rounded))
            .foregroundStyle(Palette.text)
            .lineLimit(2)

          Text(formatValue(metric.currentValue, unit: metric.unit))
            .font(.system(size: 24, weight: .bold, design: .rounded))
            .foregroundStyle(Palette.text)
            .minimumScaleFactor(0.6)
            .lineLimit(1)

          Text(metric.delta)
            .font(.system(size: 12))
            .foregroundStyle(Palette.brandStrong)
            .lineLimit(1)

          Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
  }
}

struct HumanitasWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family
  let entry: Entry

  var body: some View {
    Group {
      switch family {
      case .systemMedium: MediumView(entry: entry)
      default: SmallView(entry: entry)
      }
    }
    // Required from iOS 17: a widget that does not declare its container
    // background renders blank on the home screen rather than merely unstyled.
    .containerBackground(Palette.background, for: .widget)
  }
}

@main
struct HumanitasWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "HumanitasWidget", provider: Provider()) { entry in
      HumanitasWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Humanity progress")
    .description("How far along the world is, and one indicator a day.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
