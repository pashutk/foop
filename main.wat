(module
  (memory $mem 1)
  (global
    $mem_max_addr
    (mut i32)
    (i32.const 65536)
  )
  (global
    $mem_next_free
    (mut i32)
    (i32.const 0)
  )
  (func
    $mem_alloc
    (param $bytes i32)
    (result i32)
    (local $result i32)
    (if
      (i32.lt_u
        (i32.sub
          (global.get $mem_max_addr)
          (global.get $mem_next_free)
        )
        (local.get $bytes)
      )
      (then
        (memory.grow
          (i32.div_u
            (i32.add
              (local.get $bytes)
              (i32.const 65527)
            )
            (i32.const 65528)
          )
        )
        (drop)
        (global.set
          $mem_max_addr
          (i32.add
            (global.get $mem_max_addr)
            (local.get $bytes)
          )
        )
      )
    )
    (local.set
      $result
      (global.get $mem_next_free)
    )
    (global.set
      $mem_next_free
      (i32.add
        (local.get $bytes)
        (global.get $mem_next_free)
      )
    )
    (local.get $result)
  )
  (func
    $boolToInt
    (param $bool i32)
    (result i32)
    (local $var_39587 i32)
    (local.set
      $var_39587
      (local.get $bool)
    )
    (if
      (result i32)
      (i32.eq
        (local.get $var_39587)
        (i32.const 0)
      )
      (then
        (i32.const 1)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (local.get $var_39587)
            (i32.const 1)
          )
          (then
            (i32.const 0)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "boolToInt"
    (func $boolToInt)
  )
  (func
    $incbool
    (param $a i32)
    (result i32)
    (local.get $a)
    (i32.const 0)
    (call $boolToInt)
    (i32.add)
  )
  (export
    "incbool"
    (func $incbool)
  )
  (func
    $inc
    (param $a i32)
    (result i32)
    (local.get $a)
    (i32.const 1)
    (i32.add)
  )
  (export
    "inc"
    (func $inc)
  )
  (func
    $main
    (result i32)
    (i32.const 2)
    (call $inc)
    (i32.const 3)
    (i32.add)
  )
  (export
    "main"
    (func $main)
  )
)
